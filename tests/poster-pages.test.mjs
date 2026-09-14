import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('reviewed poster pages reuse one interest form and do not invent admissions requirements', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table profiles(id uuid primary key default gen_random_uuid(),is_owner boolean,is_active boolean);
      insert into profiles(is_owner,is_active) values(true,true);
      create table custom_forms(id uuid primary key default gen_random_uuid(),slug text unique,title text,description text,schema jsonb,published_version int,enabled boolean,task_title text,due_hours int,created_by uuid);
      create table custom_form_versions(form_id uuid,version int,title text,description text,schema jsonb,published_by uuid);
      create table custom_form_staff(form_id uuid,user_id uuid,role text,primary key(form_id,user_id,role));
      create table content_pages(id uuid primary key default gen_random_uuid(),slug text unique,title text,body text,image_url text,schedule text,placement text,kind text,registration text,form_id uuid,source_poster_id text unique,published boolean,created_by uuid);`);
    const sql = await readFile(new URL('../supabase/migrations/20260914040300_reviewed_poster_pages.sql',import.meta.url),'utf8').catch(()=> '');
    if(sql) await db.exec(sql);
    const pages=(await db.query('select * from content_pages')).rows;
    assert.equal(pages.length,4,'only the four current programme posters receive pages');
    const youth=pages.find(p=>p.source_poster_id==='youth-islamic-studies');
    assert.equal(youth.registration,'interest');
    assert.match(youth.body,/does not confirm|does not reserve/i);
    const forms=(await db.query('select * from custom_forms')).rows;
    assert.equal(forms.length,1);
    assert.equal(forms[0].id,youth.form_id);
    const fields=forms[0].schema.fields.map(f=>f.id);
    assert.deepEqual(fields,['name','email','phone','message']);
    assert.equal((await db.query("select count(*)::int n from custom_form_staff where role='responsible'")).rows[0].n,1);
    for(const p of pages.filter(p=>p!==youth)) assert.equal(p.registration,'none');
    assert.equal(pages.find(p=>p.source_poster_id==='seekers-gateway').placement,'/education/courses');
    assert.equal(pages.some(p=>p.source_poster_id==='adhan-iqamah-course'),false);
    // A repeated release does not replace edited copy or duplicate assignments.
    await db.exec("update content_pages set title='Edited title' where source_poster_id='youth-islamic-studies'");
    await db.exec(sql);
    assert.equal((await db.query('select count(*)::int n from custom_forms')).rows[0].n,1);
    assert.equal((await db.query("select title from content_pages where source_poster_id='youth-islamic-studies'")).rows[0].title,'Edited title');
  } finally { await db.close(); }
});
