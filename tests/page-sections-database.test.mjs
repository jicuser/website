import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const expected = (rows) => rows.map(({ id, updated_at }) => ({ id, updated_at }));

test('editable page blocks save atomically under staff permissions and version checks', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema public,auth,private to anon,authenticated,service_role;
    create table profiles(id uuid primary key,is_active boolean default true,permissions text[] default '{}');
    insert into profiles(id,permissions,is_active) values
      ('${id(1)}','{content,delete_content}',true), ('${id(2)}','{content}',true),
      ('${id(3)}','{}',true), ('${id(4)}','{content,delete_content}',false);
    create function private.has_permission(required text) returns boolean
    language sql stable security definer set search_path='' as $$
      select coalesce((select is_active and required=any(permissions)
        from public.profiles where id=auth.uid()),false)
    $$;
    create table page_sections(
      id uuid primary key default gen_random_uuid(), page_path text not null,
      section_key text not null, title text not null default '', body text not null default '',
      background_image_url text not null default '', image_urls jsonb not null default '[]',
      sort_order integer not null default 0, published boolean not null default true,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      unique(page_path,section_key)
    );
    alter table page_sections enable row level security;
    grant all on page_sections to anon,authenticated,service_role;
    create policy page_sections_read on page_sections for select using(published or private.has_permission('content'));
    create policy page_sections_insert on page_sections for insert to authenticated with check(private.has_permission('content'));
    create policy page_sections_update on page_sections for update to authenticated using(private.has_permission('content')) with check(private.has_permission('content'));
    create policy page_sections_delete on page_sections for delete to authenticated using(private.has_permission('content') and private.has_permission('delete_content'));
    create function touch_page_sections_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at=now(); return new; end;
    $$;
    create trigger set_page_sections_updated_at before update on page_sections
      for each row execute function touch_page_sections_updated_at();
    create table audit_log(id bigint generated always as identity,record_id uuid,action text);
    create function write_audit_log() returns trigger language plpgsql security definer set search_path='' as $$
      begin
        insert into public.audit_log(record_id,action) values(coalesce(new.id,old.id),tg_op);
        return coalesce(new,old);
      end;
    $$;
    create trigger audit_changes after insert or update or delete on page_sections
      for each row execute function write_audit_log();
  `);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261014231930_atomic_page_sections.sql', import.meta.url),
      'utf8',
    ),
  );

  const as = async (account, work, role = 'authenticated') => {
    await db.exec(
      `set role ${role}; select set_config('request.jwt.claim.sub','${account || ''}',false);`,
    );
    try {
      return await work();
    } finally {
      await db.exec('reset role');
    }
  };
  const save = (path, baseline, sections, account = id(1)) =>
    as(
      account,
      async () =>
        (
          await db.query('select public.save_page_sections($1,$2,$3) result', [
            path,
            expected(baseline),
            sections,
          ])
        ).rows[0].result,
    );
  const list = async (path) =>
    (
      await db.query(
        "select coalesce(jsonb_agg(to_jsonb(s) order by sort_order,id),'[]'::jsonb) result from page_sections s where page_path=$1",
        [path],
      )
    ).rows[0].result;
  const clear = () => db.exec('delete from page_sections; delete from audit_log;');
  const create = async (path = '/education', names = ['First', 'Second']) =>
    save(
      path,
      [],
      names.map((title) => ({ id: null, title })),
    );

  await t.test('only active content editors can save; broad table powers are removed', async () => {
    for (const account of [id(3), id(4)])
      await assert.rejects(
        () => save('/education', [], [{ title: 'Blocked' }], account),
        /permission/i,
      );
    await as(
      null,
      () =>
        assert.rejects(
          () => db.query("select save_page_sections('/education','[]','[]')"),
          /permission denied/i,
        ),
      'anon',
    );
    assert.equal(
      (await db.query("select prosecdef from pg_proc where proname='save_page_sections'")).rows[0]
        .prosecdef,
      false,
    );
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['TRUNCATE', 'REFERENCES', 'TRIGGER']) {
        assert.equal(
          (
            await db.query('select has_table_privilege($1,$2,$3) allowed', [
              role,
              'page_sections',
              privilege,
            ])
          ).rows[0].allowed,
          false,
        );
      }
    }
    assert.deepEqual(await list('/education'), []);
  });

  await t.test(
    'new blocks are hidden by default and only published blocks are public',
    async () => {
      await clear();
      let rows = await create();
      assert.ok(
        rows.every((row) => row.published === false && row.section_key === `block-${row.id}`),
      );
      assert.deepEqual(
        rows.map((row) => row.sort_order),
        [0, 1],
      );
      assert.equal(
        (await as(null, () => db.query('select * from page_sections'), 'anon')).rows.length,
        0,
      );
      rows = await save(
        '/education',
        rows,
        rows.map((row, index) => ({ ...row, published: index === 0 })),
      );
      assert.equal(
        (await as(null, () => db.query('select * from page_sections'), 'anon')).rows.length,
        1,
      );
      assert.equal(rows[1].published, false);
    },
  );

  await t.test(
    'edits and ordering share one save without changing stable block addresses',
    async () => {
      await clear();
      const original = await create();
      const reordered = await save('/education', original, [
        original[1],
        { ...original[0], title: 'Edited', section_key: 'untrusted-change' },
      ]);
      assert.deepEqual(
        reordered.map((row) => row.title),
        ['Second', 'Edited'],
      );
      assert.deepEqual(
        reordered.map((row) => row.sort_order),
        [0, 1],
      );
      assert.equal(reordered[1].section_key, original[0].section_key);
      assert.notEqual(reordered[1].updated_at, original[0].updated_at);
      assert.deepEqual(await save('/education', reordered, reordered), reordered);
    },
  );

  await t.test(
    'a stale edit, inserted block or deleted block rejects the entire saved snapshot',
    async () => {
      await clear();
      const original = await create();
      const updated = await save('/education', original, [
        { ...original[0], title: 'Other session' },
        original[1],
      ]);
      await assert.rejects(
        () => save('/education', original, original),
        /changed in another session/i,
      );
      assert.deepEqual(await list('/education'), updated);
      const inserted = await save('/education', updated, [...updated, { title: 'New elsewhere' }]);
      await assert.rejects(
        () => save('/education', updated, updated),
        /changed in another session/i,
      );
      const deleted = await save('/education', inserted, [inserted[0]]);
      await assert.rejects(
        () => save('/education', inserted, inserted),
        /changed in another session/i,
      );
      assert.deepEqual(await list('/education'), deleted);
    },
  );

  await t.test(
    'moves append at the destination without overwriting its existing content',
    async () => {
      await clear();
      const source = await create();
      const destination = await create('/youth', ['Existing destination']);
      const remaining = await save(
        '/education',
        source,
        [{ ...source[0], page_path: '/youth' }, source[1]],
        id(2),
      );
      assert.deepEqual(
        remaining.map((row) => row.id),
        [source[1].id],
      );
      const moved = await list('/youth');
      assert.deepEqual(
        moved.map((row) => row.title),
        ['Existing destination', 'First'],
      );
      assert.deepEqual(moved[0], destination[0]);
      assert.equal(moved[1].id, source[0].id);
      assert.equal(moved[1].section_key, source[0].section_key);
      await assert.rejects(
        () => save('/education', remaining, [moved[0], ...remaining]),
        /does not belong/i,
      );
    },
  );

  await t.test(
    'permanent deletion requires its own permission while hiding remains available',
    async () => {
      await clear();
      const source = await create();
      await assert.rejects(
        () => save('/education', source, [source[0]], id(2)),
        /delete content permission/i,
      );
      assert.deepEqual(await list('/education'), source);
      const hidden = await save(
        '/education',
        source,
        source.map((row) => ({ ...row, published: false })),
        id(2),
      );
      assert.equal(hidden.length, 2);
      assert.deepEqual(await save('/education', hidden, []), []);
    },
  );

  await t.test(
    'a full destination cannot receive a move that makes it impossible to edit',
    async () => {
      await clear();
      const source = await create('/education', ['Keep here']);
      await create(
        '/youth',
        Array.from({ length: 60 }, (_, index) => `Block ${index + 1}`),
      );
      await assert.rejects(
        () => save('/education', source, [{ ...source[0], page_path: '/youth' }]),
        /already has 60/i,
      );
      assert.deepEqual(await list('/education'), source);
      assert.equal((await list('/youth')).length, 60);
    },
  );

  await t.test(
    'a late move conflict rolls back preceding edits, deletions and audit entries',
    async () => {
      await clear();
      const source = await create('/education', ['Change first', 'Delete second', 'Move third']);
      await db.query('insert into page_sections(page_path,section_key,title) values($1,$2,$3)', [
        '/youth',
        source[2].section_key,
        'Conflicting destination',
      ]);
      const auditCount = (await db.query('select count(*)::int n from audit_log')).rows[0].n;
      await assert.rejects(
        () =>
          save('/education', source, [
            { ...source[0], title: 'Must roll back' },
            { ...source[2], page_path: '/youth' },
          ]),
        /already exists/i,
      );
      assert.deepEqual(await list('/education'), source);
      assert.equal((await db.query('select count(*)::int n from audit_log')).rows[0].n, auditCount);
    },
  );

  await t.test(
    'invalid paths, content types, URLs, duplicate IDs and oversized requests do not write',
    async () => {
      await clear();
      const source = await create('/education', ['One']);
      const invalid = [
        { page_path: '//outside.example' },
        { page_path: '/education/../admin' },
        { page_path: '/education?query=1' },
        { title: '' },
        { title: 'a'.repeat(161) },
        { body: 'a'.repeat(12001) },
        { body: {} },
        { published: 'true' },
        { image_urls: {} },
        { image_urls: Array(13).fill('/image.png') },
        { image_urls: ['javascript:alert(1)'] },
        { image_urls: ['//outside.example/image.png'] },
        { image_urls: ['https://example.org/image"bad.png'] },
        { background_image_url: 'http://example.org/image.png' },
        { background_image_url: '/image\\bad.png' },
      ];
      for (const patch of invalid)
        await assert.rejects(() => save('/education', source, [{ ...source[0], ...patch }]));
      await assert.rejects(() => save('/education', source, [source[0], source[0]]), /duplicate/i);
      await assert.rejects(() => save('/education', [...source, source[0]], source), /duplicate/i);
      await assert.rejects(
        () =>
          save(
            '/education',
            source,
            Array.from({ length: 61 }, () => ({ title: 'Too many' })),
          ),
        /too many/i,
      );
      await assert.rejects(
        () => save('https://outside.example', source, source),
        /valid website page/i,
      );
      assert.deepEqual(await list('/education'), source);
      const saved = await save('/education', source, [
        {
          ...source[0],
          background_image_url: '/images/background.jpg',
          image_urls: ['https://example.org/image.png'],
        },
      ]);
      assert.equal(saved[0].image_urls.length, 1);
    },
  );
});
