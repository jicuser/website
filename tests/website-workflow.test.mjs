import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(1),
  editor = id(2),
  responsible = id(3),
  other = id(4);

test('website forms, pages and actions preserve privacy and linked records', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;create schema private;create schema storage;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth,private to anon,authenticated,service_role;
      create table profiles(id uuid primary key,display_name text,is_active boolean not null default true,is_owner boolean not null default false,permissions text[] not null default '{}',staff_kinds text[] not null default '{}');
      create table form_submissions(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('contact','madrassah','itikaaf')),payload jsonb not null default '{}' check(octet_length(payload::text)<=24000),status text not null default 'new' check(status in('new','done')),created_at timestamptz not null default now());
      create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select is_active and (is_owner or required=any(permissions)) from public.profiles where id=auth.uid()),false) $$;
      alter table profiles enable row level security; alter table form_submissions enable row level security;
      grant select on profiles,form_submissions to authenticated;grant update(status) on form_submissions to authenticated;grant all on profiles,form_submissions to service_role;
      create policy forms_read on form_submissions for select to authenticated using(private.has_permission('forms_'||kind));
      create policy forms_update on form_submissions for update to authenticated using(private.has_permission('forms_'||kind)) with check(private.has_permission('forms_'||kind));
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
      insert into profiles(id,display_name,is_owner,permissions) values('${owner}','Owner',true,'{}'),('${editor}','Editor',false,'{content,forms_manage}'),('${responsible}','Responsible',false,'{}'),('${other}','Unrelated',false,'{}');`);
    for (const file of ['20260914040100_website_forms.sql', '20260914040200_content_pages.sql']) {
      const sql = await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        'utf8',
      ).catch(() => '');
      if (sql) await db.exec(sql);
    }
    assert.ok(
      (await db.query("select to_regclass('public.custom_forms') as relation")).rows[0].relation,
      'versioned website forms must exist',
    );
    const as = async (user, fn, role = 'authenticated') => {
      await db.exec(
        `set role ${role};select set_config('request.jwt.claim.sub','${user || ''}',false);`,
      );
      try {
        return await fn();
      } finally {
        await db.exec('reset role');
      }
    };
    const rpc = async (name, args = []) =>
      (await db.query(`select ${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) result`, args))
        .rows[0].result;
    const schema = {
      fields: [
        { id: 'name', type: 'text', label: 'Name', required: true },
        { id: 'email', type: 'email', label: 'Email', required: true },
      ],
    };
    const draft = {
      slug: 'test-course',
      title: 'Test course registration',
      schema,
      description: '',
      task_title: 'Review application',
      due_hours: 48,
      responsible_ids: [responsible],
      manager_ids: [editor],
      watcher_ids: [],
    };
    let form, version, page, submission, task;
    await t.test(
      'only authorised staff create forms; drafts reveal no public schema or routing',
      async () => {
        await as(other, () =>
          assert.rejects(() => rpc('save_custom_form', [JSON.stringify(draft)])),
        );
        form = await as(editor, () => rpc('save_custom_form', [JSON.stringify(draft)]));
        assert.equal(await as(null, () => rpc('get_public_form', ['test-course']), 'anon'), null);
        await as(
          null,
          () => assert.rejects(() => db.query('select * from custom_form_staff')),
          'anon',
        );
        version = await as(editor, () => rpc('publish_custom_form', [form]));
        const view = await as(null, () => rpc('get_public_form', ['test-course']), 'anon');
        assert.equal(view.version, 1);
        assert.equal(view.responsible_ids, undefined);
      },
    );
    const pageData = () => ({
      slug: 'test-course',
      title: 'Test course',
      body: 'Plain information',
      schedule: 'Friday',
      image_url: '/posters/seekers-gateway.jpg',
      placement: '/education/courses',
      kind: 'course',
      registration: 'application',
      form_id: form,
      source_poster_id: 'test-poster',
      published: false,
    });
    await t.test(
      'page creation, stable addresses and publication are separate from form status',
      async () => {
        await as(other, () =>
          assert.rejects(() => rpc('save_content_page', [JSON.stringify(pageData())])),
        );
        page = await as(editor, () => rpc('save_content_page', [JSON.stringify(pageData())]));
        assert.equal(await as(null, () => rpc('get_content_page', ['test-course']), 'anon'), null);
        page = await as(editor, () =>
          rpc('save_content_page', [JSON.stringify({ ...page, published: true })]),
        );
        const view = await as(null, () => rpc('get_content_page', ['test-course']), 'anon');
        assert.equal(view.form_slug, 'test-course');
        assert.equal(view.accepting, true);
        assert.equal(view.created_by, undefined);
        assert.equal(view.responsible_ids, undefined);
        await as(editor, () =>
          assert.rejects(
            () => rpc('save_content_page', [JSON.stringify({ ...page, slug: 'changed-address' })]),
            /address/i,
          ),
        );
      },
    );
    await t.test(
      'submissions and automatic actions are atomic and unchanged retries do not duplicate them',
      async () => {
        const args = [
          'test-course',
          version,
          JSON.stringify({ name: 'Visitor', email: 'visitor@example.invalid' }),
          'a'.repeat(64),
          id(100),
          null,
          '[]',
        ];
        submission = await as(null, () => rpc('submit_custom_form', args), 'service_role');
        assert.equal(
          await as(null, () => rpc('submit_custom_form', args), 'service_role'),
          submission,
        );
        const tasks = (await db.query('select * from work_tasks where form_id=$1', [submission]))
          .rows;
        assert.equal(tasks.length, 1);
        task = tasks[0];
        assert.equal(task.assigned_to, responsible);
        await as(other, async () => {
          assert.equal((await db.query('select * from form_submissions')).rows.length, 0);
          assert.equal((await db.query('select * from work_tasks')).rows.length, 0);
        });
        await as(responsible, async () => {
          assert.equal((await db.query('select * from form_submissions')).rows.length, 1);
          assert.equal((await db.query('select * from work_tasks')).rows.length, 1);
        });
      },
    );
    await t.test(
      'actions can change status or assignee without marking an application accepted',
      async () => {
        await as(other, () =>
          assert.rejects(() => rpc('update_form_task', [task.id, 'done', other])),
        );
        await as(responsible, () => rpc('update_form_task', [task.id, 'in_progress', responsible]));
        await as(editor, () => rpc('update_form_task', [task.id, 'waiting', editor]));
        assert.equal(
          (await db.query('select assigned_to from work_tasks where id=$1', [task.id])).rows[0]
            .assigned_to,
          editor,
        );
        assert.equal(
          (await db.query('select status from form_submissions where id=$1', [submission])).rows[0]
            .status,
          'new',
        );
      },
    );
    await t.test(
      'concurrent page edits fail rather than silently replacing later changes',
      async () => {
        const stale = { ...page };
        page = await as(editor, () =>
          rpc('save_content_page', [JSON.stringify({ ...page, title: 'Updated course' })]),
        );
        await as(editor, () =>
          assert.rejects(
            () => rpc('save_content_page', [JSON.stringify({ ...stale, title: 'Stale write' })]),
            /changed|reload/i,
          ),
        );
        assert.equal(
          (await db.query('select title from content_pages where id=$1', [page.id])).rows[0].title,
          'Updated course',
        );
      },
    );
    await t.test(
      'closed forms stay linked to visible information; hiding a page preserves submissions',
      async () => {
        await as(editor, () =>
          rpc('save_custom_form', [JSON.stringify({ ...draft, id: form, enabled: false })]),
        );
        assert.equal(
          (await as(null, () => rpc('get_content_page', ['test-course']), 'anon')).accepting,
          false,
        );
        page = await as(editor, () =>
          rpc('save_content_page', [JSON.stringify({ ...page, published: false })]),
        );
        assert.equal(await as(null, () => rpc('get_content_page', ['test-course']), 'anon'), null);
        assert.equal(
          Number((await db.query('select count(*) n from form_submissions')).rows[0].n),
          1,
        );
      },
    );
    await t.test('unsafe pictures and executable markup are never evaluated', async () => {
      await as(editor, () =>
        assert.rejects(() =>
          rpc('save_content_page', [JSON.stringify({ ...page, image_url: 'javascript:alert(1)' })]),
        ),
      );
      await as(editor, () =>
        assert.rejects(() =>
          rpc('save_content_page', [
            JSON.stringify({ ...page, image_url: '//evil.example/image.png' }),
          ]),
        ),
      );
      const updated = await as(editor, () =>
        rpc('save_content_page', [JSON.stringify({ ...page, body: '<script>alert(1)</script>' })]),
      );
      assert.equal(updated.body, '<script>alert(1)</script>');
    });
    await t.test('website scope introduces no app push devices or learning subsystem', async () => {
      for (const name of ['push_devices', 'push_outbox', 'learning_students', 'learning_records'])
        assert.equal(
          (await db.query('select to_regclass($1) t', [`public.${name}`])).rows[0].t,
          null,
        );
    });
  } finally {
    await db.close();
  }
});
