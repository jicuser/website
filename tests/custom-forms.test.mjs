import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),manager=id(2),staff=id(3),watcher=id(4),submitter=id(5),other=id(6);
const schema={fields:[{id:'name',type:'text',label:'Name',required:true},{id:'contact',type:'checkbox',label:'Contact me'},{id:'email',type:'email',label:'Email',required:true,show_when:{field:'contact',operator:'equals',value:true}},{id:'photo',type:'image',label:'Photo'}]};
const source='a'.repeat(64),token='b'.repeat(64);

test('versioned custom forms keep one inbox with isolated replies, uploads and routed tasks',async(t)=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema private;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,private to anon,authenticated,service_role;
 create table profiles(id uuid primary key,display_name text,is_active boolean default true,is_owner boolean default false,permissions text[] default '{}',staff_kinds text[] default '{}');
 create table form_submissions(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('contact','madrassah','itikaaf')),payload jsonb default '{}' check(octet_length(payload::text)<=24000),status text default 'new' check(status in('new','done')),created_at timestamptz default now());
 create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select is_active and (is_owner or required=any(permissions)) from public.profiles where id=auth.uid()),false) $$;
 alter table form_submissions enable row level security;grant select on form_submissions to authenticated;grant update(status) on form_submissions to authenticated;grant all on profiles,form_submissions to service_role;
 create policy forms_read on form_submissions for select to authenticated using(private.has_permission('forms_'||kind));
 create policy forms_update on form_submissions for update to authenticated using(private.has_permission('forms_'||kind)) with check(private.has_permission('forms_'||kind));
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);`);
 for(const path of ['20260913100552_community_workspace.sql','20260913111401_custom_forms.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${path}`,import.meta.url),'utf8'));
 await db.exec(`insert into profiles(id,display_name,is_owner,permissions)values('${owner}','Owner',true,'{}'),('${manager}','Manager',false,'{forms_manage}'),('${staff}','Responsible',false,'{}'),('${watcher}','Watcher',false,'{}'),('${submitter}','Submitter',false,'{}'),('${other}','Other',false,'{}');`);
 const as=async(user,fn,role='authenticated')=>{await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${user??''}',false);`);try{return await fn();}finally{await db.exec('reset role');}};
 const rpc=async(name,params)=>{const r=await db.query(`select ${name}(${params.map((_,i)=>`$${i+1}`).join(',')}) as result`,params);return r.rows[0]?.result;};
 const save=async(overrides={})=>as(manager,()=>rpc('save_custom_form',[JSON.stringify({slug:'community-help',title:'Community help',description:'Help us contact you',schema,task_title:'Call back',due_hours:24,responsible_ids:[staff],watcher_ids:[watcher],...overrides})]));
 let form,version,entry,upload;
 await t.test('only explicit managers create, versions are immutable and public metadata excludes routing',async()=>{
 await as(other,()=>assert.rejects(()=>rpc('save_custom_form',[JSON.stringify({schema})]),/manager/));
 form=await save();version=await as(manager,()=>rpc('publish_custom_form',[form]));assert.equal(version,1);
 const publicForm=await as(null,()=>rpc('get_public_form',['community-help']),'anon');assert.equal(publicForm.title,'Community help');assert.equal(publicForm.responsible_ids,undefined);
 await as(null,()=>assert.rejects(()=>db.query('select * from custom_forms'),/permission denied/),'anon');
 await as(watcher,()=>assert.rejects(()=>rpc('publish_custom_form',[form]),/manager/));
 await as(manager,()=>assert.rejects(()=>db.query(`update custom_form_versions set title='Changed'`),/permission denied/));
 });
 await t.test('direct service submission validates visibility, unknown fields and required answers',async()=>{
 const submit=(answers,attempt=id(100))=>as(null,()=>rpc('submit_custom_form',['community-help',1,JSON.stringify(answers),source,attempt,submitter,'[]']),'service_role');
 await assert.rejects(()=>submit({name:'Ali',contact:false,email:'hidden@example.org'}),/hidden/);
 await assert.rejects(()=>submit({name:'Ali',contact:true}),/Required/);
 await assert.rejects(()=>submit({name:'Ali',evil:'script'}),/Unknown/);
 entry=await submit({name:'Ali',contact:true,email:'ali@example.org'});
 assert.equal(await submit({name:'Ali',contact:true,email:'ali@example.org'}),entry);
 await assert.rejects(()=>submit({name:'Changed',contact:false}),/Attempt already used/);
 assert.equal(Number((await db.query(`select count(*) n from form_submissions where kind='custom'`)).rows[0].n),1);
 assert.equal(Number((await db.query(`select count(*) n from work_tasks where form_id='${entry}'`)).rows[0].n),1);
 assert.equal(Number((await db.query('select count(*) n from push_outbox')).rows[0].n),2);
 });
 await t.test('responsible and watcher see assigned inbox; unrelated account cannot read, reply, or delegate',async()=>{
 await as(staff,async()=>{assert.equal((await db.query('select * from form_submissions')).rows.length,1);assert.equal((await db.query('select * from work_tasks')).rows.length,1);assert.ok((await db.query('select * from custom_form_assignees($1)',[form])).rows.some((row)=>row.id===staff));});
 await as(other,async()=>{assert.equal((await db.query('select * from form_submissions')).rows.length,0);await assert.rejects(()=>rpc('reply_custom_form',[entry,'Steal',false]),/access/);await assert.rejects(()=>rpc('assign_custom_form_task',[entry,other,'Job',null]),/access/);});
 await as(watcher,()=>rpc('assign_custom_form_task',[entry,staff,'Confirm payment',null]));
 await as(staff,()=>assert.rejects(()=>rpc('assign_custom_form_task',[entry,other,'Leak',null]),/access/));
 });
 await t.test('own submitter sees external replies, not staff notes, with no status mutation',async()=>{
 await as(staff,()=>rpc('reply_custom_form',[entry,'Internal office note',true]));
 await as(staff,()=>rpc('reply_custom_form',[entry,'Please send a photo',false]));
 await as(submitter,async()=>{assert.equal((await db.query('select * from form_submissions')).rows.length,1);assert.equal((await db.query('select * from form_replies')).rows.length,1);await assert.rejects(()=>rpc('reply_custom_form',[entry,'Sneak note',true]),/access/);assert.equal((await db.query("update form_submissions set status='done' returning id")).rows.length,0);await rpc('reply_custom_form',[entry,'Thank you',false]);});
 await as(other,async()=>assert.equal((await db.query('select * from form_replies')).rows.length,0));
 });
 await t.test('draft edits do not change live form and stale publication versions reject',async()=>{
 await save({id:form,title:'New help title'});
 assert.equal((await as(null,()=>rpc('get_public_form',['community-help']),'anon')).title,'Community help');
 version=await as(manager,()=>rpc('publish_custom_form',[form]));assert.equal(version,2);
 await as(null,()=>assert.rejects(()=>rpc('submit_custom_form',['community-help',1,JSON.stringify({name:'Ali'}),source,id(101),submitter,'[]']),/form_version_changed/),'service_role');
 assert.equal((await db.query(`select schema_snapshot->>'title' title from form_submissions where id='${entry}'`)).rows[0].title,'Community help');
 });
 await t.test('uploads are bound to form, attempt, authenticated identity and secret proof',async()=>{
 const result=await as(null,()=>rpc('prepare_custom_form_upload',['community-help',2,'photo',id(102),source,submitter,token,'photo.png','image/png',20]),'service_role');upload=result.id;
 await as(null,()=>assert.rejects(()=>rpc('finish_custom_form_upload',[upload,'c'.repeat(64)]),/expired/),'service_role');
 await as(null,()=>rpc('finish_custom_form_upload',[upload,token]),'service_role');
 const answers=JSON.stringify({name:'Ali',photo:upload}),claims=JSON.stringify([{id:upload,token_hash:token}]);
 await as(null,()=>assert.rejects(()=>rpc('submit_custom_form',['community-help',2,answers,source,id(103),submitter,claims]),/belong/),'service_role');
 await as(null,()=>assert.rejects(()=>rpc('submit_custom_form',['community-help',2,answers,source,id(102),other,claims]),/belong/),'service_role');
 const withFile=await as(null,()=>rpc('submit_custom_form',['community-help',2,answers,source,id(102),submitter,claims]),'service_role');
 assert.ok(withFile);
 await as(submitter,async()=>assert.equal((await db.query('select * from form_attachments')).rows.length,1));
 await as(other,async()=>{assert.equal((await db.query('select * from form_attachments')).rows.length,0);await assert.rejects(()=>rpc('custom_attachment_object',[upload,submitter]),/permission denied/);});
 assert.equal(await as(null,()=>rpc('custom_attachment_object',[upload,other]),'service_role'),null);
 });
 await t.test('bounded literal search, staff-only export and immediate access revocation',async()=>{
 const result=await as(staff,()=>rpc('search_form_submissions',['ali','custom',form,null,null,null,0,25,false,false]));assert.equal(result.total,2);
 const none=await as(other,()=>rpc('search_form_submissions',['','custom',form,null,null,null,0,25,false,false]));assert.equal(none.total,0);
 await as(null,()=>assert.rejects(()=>rpc('custom_form_export',[form,other,null]),/access/),'service_role');
 await as(staff,()=>assert.rejects(()=>rpc('search_form_submissions',['','custom',form,null,null,null,0,10000,false,false]),/bounds/));
 await db.exec(`update profiles set is_active=false where id='${staff}'`);
 await as(staff,async()=>{assert.equal((await db.query('select * from form_submissions')).rows.length,0);assert.equal((await db.query('select * from work_tasks')).rows.length,0);assert.equal((await db.query('select * from user_notifications')).rows.length,0);});
 });
 await db.close();
});
