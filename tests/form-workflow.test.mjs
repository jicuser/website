import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import { validateAnswers, validateSchema } from '../supabase/functions/custom-forms/validation.mjs';
import { loadAdminOverview } from '../src/features/admin/overview.js';

const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
const migration = new URL(
  (await readdir(migrationDirectory)).find((name) => name.endsWith('_unified_form_workflow.sql')),
  migrationDirectory,
);
const source = 'a'.repeat(64);

test('built-in builder migration retains legacy history, permissions and versioned routing', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(`insert into profiles(id,display_name,permissions) values
    ('${id(7)}','Contact staff','{forms_contact}'),
    ('${id(8)}','Madrassah staff','{forms_madrassah}'),
    ('${id(9)}','Itikaf staff','{forms_itikaaf}'),
    ('${id(10)}','Contact editor','{forms_manage,forms_contact}'),
    ('${id(11)}','Custom response reader','{forms_custom}');
    insert into form_submissions(id,kind,payload,status) values
    ('${id(100)}','contact','{"name":"Historical sender","question":"Original question"}','done'),
    ('${id(101)}','madrassah','{"name":"Historical parent","query":"Original enquiry"}','new'),
    ('${id(102)}','itikaaf','{"attendee_name":"Historical attendee","attendee_age":15}','new');`);
  await as(id(1), () =>
    db.exec(
      `insert into form_workflows(kind,assigned_to,title,due_hours) values('contact','${id(7)}','Reply to contact',24);`,
    ),
  );
  const before = (await db.query('select * from form_submissions order by id')).rows;
  await db.exec(await readFile(migration, 'utf8'));
  assert.deepEqual((await db.query('select * from form_submissions order by id')).rows, before);
  const forms = (await db.query('select * from custom_forms order by built_in_kind')).rows;
  assert.deepEqual(
    forms.map((form) => form.built_in_kind),
    ['contact', 'itikaaf', 'madrassah'],
  );
  const contact = forms.find((form) => form.built_in_kind === 'contact');
  const itikaf = forms.find((form) => form.built_in_kind === 'itikaaf');
  assert.equal(
    (
      await db.query(
        "select user_id from custom_form_staff where form_id=$1 and role='responsible'",
        [contact.id],
      )
    ).rows[0].user_id,
    id(7),
  );

  await t.test(
    'legacy response permissions see the same original and future inbox, without granting broad custom readers',
    async () => {
      assert.equal((await as(id(7), () => rpc('admin_forms_overview'))).length, 1);
      assert.equal((await as(id(7), () => rpc('admin_forms_overview')))[0].can_manage, false);
      assert.equal((await as(id(2), () => rpc('admin_forms_overview'))).length, 0);
      assert.equal((await as(id(11), () => rpc('admin_forms_overview'))).length, 0);
      await as(id(7), () =>
        assert.rejects(
          () => rpc('save_custom_form', [{ ...contact, responsible_ids: [id(7)] }]),
          /manager/,
        ),
      );
      await as(id(10), () =>
        assert.rejects(
          () => rpc('save_custom_form', [{ ...contact, responsible_ids: [id(3)] }]),
          /existing permission/,
        ),
      );
      const entry = await as(
        null,
        () =>
          rpc('submit_custom_form', [
            contact.slug,
            1,
            { name: 'New sender', email: 'sender@example.org', question: 'New question' },
            source,
            id(200),
            null,
            [],
          ]),
        'service_role',
      );
      const result = await as(id(7), () =>
        rpc('search_form_submissions', [
          '',
          null,
          contact.id,
          null,
          null,
          null,
          0,
          25,
          false,
          false,
        ]),
      );
      assert.equal(result.total, 2);
      assert.equal(result.new_count, 1);
      assert.equal(result.done_count, 1);
      assert.equal(
        (
          await as(id(7), () =>
            rpc('search_form_submissions', [
              '',
              'contact',
              null,
              null,
              null,
              null,
              0,
              25,
              false,
              false,
            ]),
          )
        ).total,
        2,
      );
      assert.equal(
        (await as(id(11), () => db.query('select * from form_submissions'))).rows.length,
        0,
      );
      await as(id(11), () => assert.rejects(() => rpc('task_assignees', [entry]), /Form access/));
      await as(id(11), () =>
        assert.rejects(
          () => rpc('create_work_task', ['Unauthorised follow-up', id(11), entry, null, '']),
          /Form access/,
        ),
      );
      assert.equal(
        (await db.query('select assigned_to from work_tasks where form_id=$1', [entry])).rows[0]
          .assigned_to,
        id(7),
      );
      assert.equal((await as(id(7), () => rpc('admin_forms_overview')))[0].new_count, 1);
    },
  );

  await t.test(
    'the shared schema preserves integer ages and required consent precisely for ages 11 through 16',
    async () => {
      validateSchema(itikaf.schema);
      const answers = {
        attendee_name: 'Visitor',
        attendee_age: 17,
        attendee_address: 'Example address',
        attendee_phone: '07700 900000',
        attendee_email: 'visitor@example.org',
        emergency_contact_name: 'Relative',
        emergency_contact_phone: '+44 7700 900000',
        emergency_contact_relationship: 'Parent',
      };
      assert.deepEqual(validateAnswers(itikaf.schema, answers), answers);
      for (const age of [11, 16]) {
        assert.throws(
          () => validateAnswers(itikaf.schema, { ...answers, attendee_age: age }),
          /guardian name/,
        );
        await as(
          null,
          () =>
            assert.rejects(
              () =>
                rpc('submit_custom_form', [
                  itikaf.slug,
                  1,
                  { ...answers, attendee_age: age },
                  source,
                  id(300 + age),
                  null,
                  [],
                ]),
              /Required field/,
            ),
          'service_role',
        );
      }
      for (const age of [0, 121, 15.5]) {
        assert.throws(
          () => validateAnswers(itikaf.schema, { ...answers, attendee_age: age }),
          /Check Age/,
        );
        await as(
          null,
          () =>
            assert.rejects(
              () =>
                rpc('submit_custom_form', [
                  itikaf.slug,
                  1,
                  { ...answers, attendee_age: age },
                  source,
                  id(400 + Math.floor(age)),
                  null,
                  [],
                ]),
              /Invalid number/,
            ),
          'service_role',
        );
      }
      for (const age of [10, 17])
        await as(
          null,
          () =>
            rpc('submit_custom_form', [
              itikaf.slug,
              1,
              { ...answers, attendee_age: age },
              source,
              id(500 + age),
              null,
              [],
            ]),
          'service_role',
        );
    },
  );

  await t.test(
    'live edits retain snapshots, reject stale writes and keep published addresses fixed',
    async () => {
      const assignments = { responsible_ids: [id(7)], manager_ids: [id(10)], watcher_ids: [] };
      const saved = await as(id(10), () =>
        rpc('save_form_workflow', [
          {
            ...contact,
            ...assignments,
            expected_updated_at: contact.updated_at,
            title: 'Contact our team',
          },
          false,
          null,
        ]),
      );
      assert.equal(
        (await as(null, () => rpc('get_public_form', [contact.slug]), 'anon')).title,
        'Contact Us',
      );
      await as(id(10), () =>
        assert.rejects(
          () =>
            rpc('save_form_workflow', [
              { ...contact, ...assignments, expected_updated_at: contact.updated_at },
              true,
              null,
            ]),
          /another session/,
        ),
      );
      await as(id(10), () =>
        assert.rejects(
          () =>
            rpc('save_form_workflow', [
              {
                ...saved.form,
                ...assignments,
                expected_updated_at: saved.form.updated_at,
                slug: 'different-contact',
              },
              true,
              null,
            ]),
          /address is protected/,
        ),
      );
      const published = await as(id(10), () =>
        rpc('save_form_workflow', [
          { ...saved.form, ...assignments, expected_updated_at: saved.form.updated_at },
          true,
          null,
        ]),
      );
      assert.equal(published.form.published_version, 2);
      assert.equal(
        (await as(null, () => rpc('get_public_form', [contact.slug]), 'anon')).title,
        'Contact our team',
      );
      assert.equal(
        (
          await db.query(
            "select schema_snapshot->>'title' as title from form_submissions where custom_form_id=$1",
            [contact.id],
          )
        ).rows[0].title,
        'Contact Us',
      );
      assert.equal(
        (
          await db.query('select title from custom_form_versions where form_id=$1 and version=1', [
            contact.id,
          ])
        ).rows[0].title,
        'Contact Us',
      );
    },
  );

  await t.test(
    'late legacy clients obey published questions, closure and current routing without rewriting older rows',
    async () => {
      await db.query('insert into form_submissions(id,kind,payload) values($1,$2,$3)', [
        id(700),
        'contact',
        { name: 'Legacy browser', email: 'browser@example.org', question: 'From an open tab' },
      ]);
      assert.equal(
        (await db.query('select form_version from form_submissions where id=$1', [id(700)])).rows[0]
          .form_version,
        2,
      );
      assert.equal(
        (await db.query('select assigned_to from work_tasks where form_id=$1', [id(700)])).rows[0]
          .assigned_to,
        id(7),
      );
      await as(id(10), () => rpc('set_custom_form_open', [contact.id, false]));
      await assert.rejects(
        () =>
          db.query('insert into form_submissions(kind,payload) values($1,$2)', [
            'contact',
            { name: 'Closed', email: 'closed@example.org', question: 'Closed' },
          ]),
        /currently closed/,
      );
      assert.equal(await as(null, () => rpc('get_public_form', [contact.slug]), 'anon'), null);
      assert.equal(
        (await db.query('select payload from form_submissions where id=$1', [id(100)])).rows[0]
          .payload.question,
        'Original question',
      );
      await as(id(10), () => rpc('set_custom_form_open', [contact.id, true]));
      await db.query("update profiles set permissions='{}' where id=$1", [id(7)]);
      assert.equal(
        (await as(id(7), () => db.query('select * from form_submissions'))).rows.length,
        0,
      );
      assert.equal(await as(null, () => rpc('get_public_form', [contact.slug]), 'anon'), null);
    },
  );
});

test('staff overview counts each migrated built-in once and queries only unmigrated kinds', async () => {
  const calls = [];
  const client = {
    rpc(name, args) {
      calls.push([name, args?.p_kind]);
      return {
        abortSignal: async () => ({
          data:
            name === 'admin_forms_overview'
              ? [{ built_in_kind: 'contact', new_count: 11, done_count: 2, open_actions: 1 }]
              : { new_count: 3, done_count: 1 },
        }),
      };
    },
  };
  const result = await loadAdminOverview(client, {
    can: (permission) => ['forms', 'forms_contact', 'forms_madrassah'].includes(permission),
    certificatesEnabled: false,
  });
  assert.deepEqual(result.forms, {
    value: { waiting: 14, complete: 3, actions: 1, forms: 2 },
    error: false,
  });
  assert.deepEqual(calls, [
    ['admin_forms_overview', undefined],
    ['search_form_submissions', 'madrassah'],
  ]);
});

test('the live baseline without legacy workflow tables or routing triggers also migrates safely', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(`drop trigger form_route on form_submissions;
    drop function private.route_form_submission();
    drop table form_workflows;
    insert into form_submissions(id,kind,payload) values('${id(800)}','contact','{"name":"Original sender"}');`);
  await db.exec(await readFile(migration, 'utf8'));
  const definitions = (await db.query('select * from custom_forms order by built_in_kind')).rows;
  assert.equal(definitions.length, 3);
  assert.ok(definitions.every((form) => form.due_hours === 48));
  assert.equal(
    (await db.query("select user_id from custom_form_staff where role='responsible'")).rows.every(
      (row) => row.user_id === id(1),
    ),
    true,
  );
  const contact = definitions.find((form) => form.built_in_kind === 'contact');
  const entry = await as(
    null,
    () =>
      rpc('submit_custom_form', [
        contact.slug,
        1,
        { name: 'Versioned sender', email: 'sender@example.org', question: 'New response' },
        source,
        id(801),
        null,
        [],
      ]),
    'service_role',
  );
  assert.equal(
    Number(
      (await db.query('select count(*) as total from work_tasks where form_id=$1', [entry])).rows[0]
        .total,
    ),
    1,
  );
  await db.query('insert into form_submissions(id,kind,payload) values($1,$2,$3)', [
    id(802),
    'contact',
    { name: 'Older browser', email: 'older@example.org', question: 'Original endpoint' },
  ]);
  assert.equal(
    Number(
      (await db.query('select count(*) as total from work_tasks where form_id=$1', [id(802)]))
        .rows[0].total,
    ),
    1,
  );
  assert.equal(
    (await db.query('select form_version from form_submissions where id=$1', [id(802)])).rows[0]
      .form_version,
    1,
  );
  assert.deepEqual(
    (
      await db.query('select payload,kind,form_version from form_submissions where id=$1', [
        id(800),
      ])
    ).rows[0],
    { payload: { name: 'Original sender' }, kind: 'contact', form_version: null },
  );
  assert.equal(
    (await db.query("select to_regclass('public.form_workflows') as relation")).rows[0].relation,
    null,
  );
});

test('form creation associates pages atomically while requiring independent content permission', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(await readFile(migration, 'utf8'));
  const draft = {
    slug: 'new-community-form',
    title: 'Community form',
    schema: { fields: [{ id: 'name', label: 'Your name', type: 'text', required: true }] },
    responsible_ids: [id(3)],
  };
  const page = {
    slug: 'community-programme',
    title: 'Community programme',
    placement: '/education',
    registration: 'interest',
    published: true,
  };
  await as(id(2), () =>
    assert.rejects(() => rpc('save_form_workflow', [draft, true, page]), /Content permission/),
  );
  assert.equal(
    (await db.query('select id from custom_forms where slug=$1', [draft.slug])).rows.length,
    0,
  );
  const direct = await as(id(2), () => rpc('save_form_workflow', [draft, false, null]));
  assert.equal(direct.form.published_version, null);
  assert.equal(direct.page, null);
  await as(id(6), () =>
    assert.rejects(
      () => rpc('save_form_workflow', [{ ...draft, slug: 'content-only-form' }, true, page]),
      /manager/,
    ),
  );
  const created = await as(id(1), () =>
    rpc('save_form_workflow', [{ ...draft, slug: 'programme-form' }, true, page]),
  );
  assert.equal(created.form.published_version, 1);
  assert.equal(created.page.form_id, created.form.id);
  assert.equal(created.page.published, true);
  const publicPage = await as(null, () => rpc('get_site_page', [page.slug]), 'anon');
  assert.equal(publicPage.form.open, true);
  await as(id(1), () =>
    assert.rejects(
      () =>
        rpc('save_form_workflow', [
          { ...draft, slug: 'rollback-on-page-error' },
          true,
          { ...page, placement: '/invalid' },
        ]),
      /check constraint/,
    ),
  );
  assert.equal(
    (await db.query("select id from custom_forms where slug='rollback-on-page-error'")).rows.length,
    0,
  );
  const hidden = await as(id(1), () =>
    rpc('save_form_workflow', [
      { ...draft, slug: 'hidden-page-form' },
      false,
      { ...page, slug: 'hidden-programme', published: false },
    ]),
  );
  assert.equal(hidden.page.published, false);
  assert.equal(await as(null, () => rpc('get_site_page', [hidden.page.slug]), 'anon'), null);
  await as(id(1), () =>
    assert.rejects(
      () =>
        rpc('save_form_workflow', [
          { ...draft, slug: 'cannot-replace-page-form' },
          true,
          { ...created.page, expected_updated_at: created.page.updated_at },
        ]),
      /already has a form/,
    ),
  );
  const emptyPage = await as(id(1), () =>
    rpc('save_site_page', [
      { slug: 'existing-page', title: 'Existing page', placement: '/youth', published: true },
    ]),
  );
  const linked = await as(id(1), () =>
    rpc('save_form_workflow', [
      { ...draft, slug: 'existing-page-form' },
      true,
      { ...emptyPage, expected_updated_at: emptyPage.updated_at, registration: 'interest' },
    ]),
  );
  assert.equal(linked.page.id, emptyPage.id);
  assert.equal(linked.page.form_id, linked.form.id);
  await as(id(1), () =>
    assert.rejects(
      () =>
        rpc('save_form_workflow', [
          {
            ...linked.form,
            expected_updated_at: linked.form.updated_at,
            responsible_ids: [id(3)],
            title: 'Should roll back',
          },
          true,
          { ...emptyPage, expected_updated_at: emptyPage.updated_at, registration: 'interest' },
        ]),
      /another session/,
    ),
  );
  assert.equal(
    (
      await db.query('select title,published_version from custom_forms where id=$1', [
        linked.form.id,
      ])
    ).rows[0].title,
    draft.title,
  );
  await as(
    null,
    () => assert.rejects(() => rpc('save_form_workflow', [draft, true, null]), /permission denied/),
    'anon',
  );
});
