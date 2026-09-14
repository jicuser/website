import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase } from './helpers/formsDatabase.mjs';

const migration = new URL('../supabase/migrations/20260914112000_poster_detail_pages.sql', import.meta.url);
const poster = (key, groups = ['education']) => ({ id:key, title:`Saved ${key}`, detail:'Existing saved details', subtitle:'Already approved subtitle', alt:'Existing full poster description', image:`/posters/${key}.jpg`, schedule:'Existing timetable', groups });

test('poster pages reuse current content, preserve hidden items and never invent staff assignments', async t => {
  const {db} = await formsDatabase(); t.after(() => db.close());
  const content = [poster('open-quran-circle'),poster('youth-islamic-studies'),poster('seekers-gateway'),poster('after-maghrib'),poster('adhan-iqamah-course',[]),poster('unrelated-poster')];
  await db.exec('create table page_content(content_key text primary key, content_value text);');
  await db.query('insert into page_content values($1,$2)', ['programme_posters',JSON.stringify(content)]);
  const sql = await readFile(migration,'utf8'); await db.exec(sql);
  const rows=(await db.query('select * from site_pages order by slug')).rows;
  assert.equal(rows.length,5);
  assert.equal(rows.find(r=>r.slug==='adhan-iqamah-course').published,false);
  assert.equal(rows.find(r=>r.slug==='seekers-gateway').placement,'/education/courses');
  assert.equal(rows.find(r=>r.slug==='youth-islamic-studies').registration,'interest');
  for(const row of rows) {
    assert.equal(row.created_by,null); assert.equal(row.form_id,null);
    assert.ok(row.title.startsWith('Saved ')); assert.ok(row.body.includes('Existing saved details'));
    if(row.slug!=='youth-islamic-studies') assert.equal(row.registration,'none');
  }
  assert.equal((await db.query('select count(*)::integer n from custom_forms')).rows[0].n,0);
  await db.exec("update site_pages set title='Staff edited title',published=false where slug='seekers-gateway';");
  await db.exec(sql);
  const preserved=(await db.query("select title,published from site_pages where slug='seekers-gateway'")).rows[0];
  assert.equal(preserved.title,'Staff edited title'); assert.equal(preserved.published,false);
  assert.equal((await db.query('select count(*)::integer n from site_pages')).rows[0].n,5);
  assert.deepEqual(JSON.parse((await db.query("select content_value from page_content where content_key='programme_posters'")).rows[0].content_value),content);
});
