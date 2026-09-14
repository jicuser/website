import test from 'node:test';
import assert from 'node:assert/strict';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('page publication, responses and assigned actions stay linked and private',async t=>{
 const {db,as,rpc}=await formsDatabase();t.after(()=>db.close());
 const definition={slug:'course-interest',title:'Course interest',schema:{fields:[{id:'name',label:'Name',type:'text',required:true}]},responsible_ids:[id(3)]};
 const form=await as(id(2),()=>rpc('save_custom_form',[definition]));
 await as(id(2),()=>rpc('publish_custom_form',[form]));
 let page=await as(id(6),()=>rpc('save_site_page',[{title:'Course',slug:'course',placement:'/education/courses',kind:'course',body:'Course information',form_id:form,registration:'interest',published:false}]));
 await t.test('drafts are not publicly readable',async()=>{
  assert.equal(await as(null,()=>rpc('get_site_page',['course']),'anon'),null);
  await as(null,()=>assert.rejects(()=>db.query('select * from site_pages'),/permission denied/),'anon');
  await as(id(5),()=>assert.rejects(()=>rpc('save_site_page',[{...page,published:true}]),/permission/i));
  assert.deepEqual(await as(id(5),()=>rpc('admin_forms_overview')),[]);
 });
 await t.test('publishing exposes content without staff metadata',async()=>{
  page=await as(id(6),()=>rpc('save_site_page',[{...page,expected_updated_at:page.updated_at,published:true}]));
  const shown=await as(null,()=>rpc('get_site_page',['course']),'anon');
  assert.equal(shown.title,'Course');assert.equal(shown.form.open,true);assert.equal(shown.created_by,undefined);assert.equal(shown.form.responsible_ids,undefined);
 });
 await t.test('URLs and optimistic concurrency are protected',async()=>{
  const old=page;
  page=await as(id(6),()=>rpc('save_site_page',[{...page,expected_updated_at:page.updated_at,placement:'/education'}]));
  assert.equal(page.slug,'course');
  await as(id(6),()=>assert.rejects(()=>rpc('save_site_page',[{...old,expected_updated_at:old.updated_at,title:'Stale'}]),/changed/i));
  for(const patch of [{slug:'../admin'},{placement:'/admin'},{image_url:'http://unsafe.example/pic.png'},{slug:'different-address'}]) await as(id(6),()=>assert.rejects(()=>rpc('save_site_page',[{...page,...patch,expected_updated_at:page.updated_at}])));
 });
 await t.test('responses create scoped actions and named responsibility',async()=>{
  await as(null,()=>rpc('submit_custom_form',['course-interest',1,{name:'Applicant'},'a'.repeat(64),id(100),null,[]]),'service_role');
  const forms=await as(id(3),()=>rpc('admin_forms_overview'));
  assert.equal(forms[0].new_count,1);assert.equal(forms[0].people[0].display_name,'Responsible person');assert.equal(forms[0].pages[0].slug,'course');
  const profile=(await as(id(3),()=>db.query('select * from get_my_profile()'))).rows[0];
  assert.equal(profile.has_assigned_forms,true);assert.deepEqual(profile.permissions,[]);
 });
 await t.test('form managers can reassign actions only to eligible people',async()=>{
  const task=(await as(id(2),()=>rpc('admin_form_tasks',[form]))).rows[0];assert.ok(task);
  await as(id(2),()=>assert.rejects(()=>rpc('reassign_form_task',[task.id,id(5),task.updated_at]),/access/i));
  const stored=(await db.query('select * from custom_forms where id=$1',[form])).rows[0];
  await as(id(2),()=>rpc('save_custom_form',[{...definition,id:form,expected_updated_at:stored.updated_at,responsible_ids:[id(3),id(4)]}]));
  await as(id(2),()=>rpc('reassign_form_task',[task.id,id(4),task.updated_at]));
  assert.equal((await as(id(4),()=>rpc('admin_form_tasks',[form]))).rows[0].assignee_name,'Replacement person');
  assert.equal((await as(id(3),()=>rpc('admin_form_tasks',[form]))).rows.length,0);
  assert.ok((await as(id(4),()=>db.query('select * from user_notifications'))).rows.some(n=>n.entity_id===task.id));
 });
 await t.test('hiding a page and closing registrations never delete responses',async()=>{
  await as(id(6),()=>rpc('save_site_page',[{...page,expected_updated_at:page.updated_at,published:false}]));
  assert.equal(await as(null,()=>rpc('get_site_page',['course']),'anon'),null);
  assert.ok(await as(null,()=>rpc('get_public_form',['course-interest']),'anon'));
  await as(id(2),()=>rpc('set_custom_form_open',[form,false]));
  assert.equal(await as(null,()=>rpc('get_public_form',['course-interest']),'anon'),null);
  assert.equal((await db.query('select count(*)::int n from form_submissions')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from work_tasks')).rows[0].n,1);
 });
 await t.test('website-only migration has no remote push, payment or learning tables',async()=>{
  assert.deepEqual((await db.query("select tablename from pg_tables where schemaname='public' and (tablename like 'push_%' or tablename like 'learning_%' or tablename like 'fee_%')")).rows,[]);
 });
});
