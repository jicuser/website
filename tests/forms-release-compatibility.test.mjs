import test from 'node:test';
import assert from 'node:assert/strict';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('an enabled published form cannot silently lose its responsible people', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  const draft = {
    slug: 'test-course',
    title: 'Test course',
    schema: { fields: [{ id: 'name', label: 'Name', type: 'text', required: true }] },
    responsible_ids: [id(3)],
  };
  const form = await as(id(2), () => rpc('save_custom_form', [draft]));
  await as(id(2), () => rpc('publish_custom_form', [form]));
  await as(id(2), () =>
    assert.rejects(
      () => rpc('save_custom_form', [{ ...draft, id: form, responsible_ids: [] }]),
      /responsible/i,
    ),
  );
  assert.ok(await as(null, () => rpc('get_public_form', ['test-course']), 'anon'));
});

test('contact-only staff can use the unified form RPCs without seeing registrations or custom forms', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.query(
    `insert into public.profiles(id, display_name, permissions) values ($1, 'Contact reviewer', '{forms_contact}');`,
    [id(7)],
  );
  const form = await as(id(2), () =>
    rpc('save_custom_form', [
      {
        slug: 'private-registration',
        title: 'Private registration',
        schema: { fields: [{ id: 'name', label: 'Name', type: 'text', required: true }] },
        responsible_ids: [id(3)],
      },
    ]),
  );
  await as(id(2), () => rpc('publish_custom_form', [form]));
  await as(
    null,
    () =>
      rpc('submit_custom_form', [
        'private-registration',
        1,
        { name: 'Private applicant' },
        'b'.repeat(64),
        id(100),
        null,
        [],
      ]),
    'service_role',
  );
  await db.query(
    `insert into public.form_submissions(id, kind, payload, status) values
      ($1, 'contact', '{"name":"Waiting contact"}', 'new'),
      ($2, 'contact', '{"name":"Completed contact"}', 'done'),
      ($3, 'madrassah', '{"name":"Private pupil"}', 'new'),
      ($4, 'itikaaf', '{"name":"Private registrant"}', 'new');`,
    [id(201), id(202), id(203), id(204)],
  );

  assert.equal((await as(id(3), () => rpc('public.admin_forms_overview')))[0].new_count, 1);
  assert.deepEqual(await as(id(7), () => rpc('public.admin_forms_overview')), []);
  const contacts = await as(id(7), () => rpc('public.search_form_submissions'));
  assert.deepEqual(contacts.rows.map((row) => row.id).sort(), [id(201), id(202)]);
  assert.deepEqual([contacts.total, contacts.new_count, contacts.done_count], [2, 1, 1]);
  for (const kind of ['madrassah', 'itikaaf', 'custom']) {
    const hidden = await as(id(7), () => rpc('public.search_form_submissions', ['', kind]));
    assert.deepEqual(hidden, { rows: [], total: 0, new_count: 0, done_count: 0 });
  }
  const forcedForm = await as(id(7), () =>
    rpc('public.search_form_submissions', ['', 'custom', form]),
  );
  assert.deepEqual(forcedForm, { rows: [], total: 0, new_count: 0, done_count: 0 });

  const completed = await as(id(7), () =>
    db.query(`update public.form_submissions set status = 'done' where id = $1 returning id`, [
      id(201),
    ]),
  );
  assert.deepEqual(completed.rows, [{ id: id(201) }]);
  const forbidden = await as(id(7), () =>
    db.query(`update public.form_submissions set status = 'done' where id = $1 returning id`, [
      id(203),
    ]),
  );
  assert.deepEqual(forbidden.rows, []);
});
