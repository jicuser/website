import test from 'node:test';
import assert from 'node:assert/strict';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('an enabled published form cannot silently lose its responsible people', async t => {
  const {db, as, rpc} = await formsDatabase();
  t.after(() => db.close());
  const draft = {slug:'test-course', title:'Test course', schema:{fields:[{id:'name',label:'Name',type:'text',required:true}]}, responsible_ids:[id(3)]};
  const form = await as(id(2), () => rpc('save_custom_form',[draft]));
  await as(id(2), () => rpc('publish_custom_form',[form]));
  await as(id(2), () => assert.rejects(() => rpc('save_custom_form',[{...draft,id:form,responsible_ids:[]}]), /responsible/i));
  assert.ok(await as(null, () => rpc('get_public_form',['test-course']), 'anon'));
});
