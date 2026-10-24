import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { noticePlacement } from '../src/lib/noticePlacement.js';
test('unknown display values fall back to safe, non-executable positions', () => {
  assert.deepEqual(
    noticePlacement({
      placement: 'javascript:alert(1)',
      position: 'fixed;top:0',
      notification: 'true',
    }),
    { placement: 'before-events', position: 'bottom-right', notification: false },
  );
});
test('notice settings reject invalid placement and remove anonymous mutation rights', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    for (const name of [
      'announcements',
      'events',
      'livestream_settings',
      'page_content',
      'page_sections',
      'prayer_times',
      'team_members',
      'audit_log',
      'profiles',
    ])
      await db.exec(`create table ${name}(id int); grant all on ${name} to anon;`);
    await db.exec(
      await readFile(new URL('../supabase/migrations/20261024195918_notice_placement_and_public_grants.sql', import.meta.url), 'utf8'),
    );
    await db.exec('insert into announcements(id) values(1)');
    await assert.rejects(
      db.exec(
        `update announcements set display_settings='{"placement":"bad","notification":true,"position":"top-right"}'`,
      ),
      /constraint/,
    );
    await db.exec('set role anon');
    await assert.rejects(db.exec('insert into announcements(id) values(2)'), /permission denied/);
    await assert.rejects(db.query('select * from profiles'), /permission denied/);
    assert.equal((await db.query('select * from announcements')).rows.length, 1);
  } finally {
    await db.close();
  }
});
