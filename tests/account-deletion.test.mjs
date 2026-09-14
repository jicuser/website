import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteStaffAccount } from '../supabase/functions/manage-user/delete-account.mjs';
const owner = { id: '10000000-0000-4000-8000-000000000001', is_owner: true, is_active: true, display_name: 'Centre owner' };
const staff = { id: '10000000-0000-4000-8000-000000000002', is_owner: false, is_active: false, display_name: 'Test staff' };

function backend({ inputs = [], inputError = null, auditError = null, deleteError = null,
  deleteThrows = false, completionError = null } = {}) {
  const state = { accounts: [staff.id], requests: [], audit: [], queryTables: [] };
  const db = {
    from(table) {
      state.queryTables.push(table);
      const q = {
        select() { return q; }, eq() { return q; },
        limit: async () => ({ data: inputs, error: inputError }),
        insert(row) { state.audit.push({ id: 'audit-1', ...row }); return q; },
        single: async () => ({ data: auditError ? null : { id: 'audit-1' }, error: auditError }),
        update(values) {
          return { eq: async () => {
            if (!completionError) Object.assign(state.audit[0], values);
            return { error: completionError };
          } };
        },
      }; return q;
    },
    auth: { admin: { deleteUser: async (id) => {
      state.requests.push(id);
      if (deleteThrows) throw new Error('Connection lost');
      if (!deleteError) state.accounts = state.accounts.filter(value => value !== id);
      return { error: deleteError };
    } } },
  };
  return { db, state };
}
const remove = deleteStaffAccount;

for (const [name, actor, target, confirmation] of [
  ['anonymous actor', null, staff, 'DELETE'],
  ['disabled owner', {...owner, is_active:false}, staff, 'DELETE'],
  ['delegated staff manager', {...owner, is_owner:false, permissions:['users']}, staff, 'DELETE'],
  ['truthy owner string', {...owner, is_owner:'true'}, staff, 'DELETE'],
  ['self deletion', owner, {...staff,id:owner.id}, 'DELETE'],
  ['any owner target', owner, {...staff,is_owner:true}, 'DELETE'],
  ['enabled account', owner, {...staff,is_active:true}, 'DELETE'],
  ['missing account', owner, null, 'DELETE'],
  ['missing confirmation', owner, staff, undefined],
]) {
  test(`deletion rejects ${name} without touching accounts or audit records`, async () => {
    const {db,state}=backend();
    await assert.rejects(()=>remove(db,actor,target,confirmation));
    assert.deepEqual(state.accounts,[staff.id]);
    assert.deepEqual(state.requests,[]);
    assert.deepEqual(state.audit,[]);
  });
}

test('existing TV inputs block account removal rather than cascading away a source', async () => {
  const {db,state}=backend({inputs:[{session_id:'source'}]});
  await assert.rejects(()=>remove(db,owner,staff,'DELETE'),/stream|source/i);
  assert.deepEqual(state.accounts,[staff.id]); assert.deepEqual(state.requests,[]);
});

test('a failed dependency check never proceeds to deletion', async () => {
  const {db,state}=backend({inputError:{code:'unavailable'}});
  await assert.rejects(()=>remove(db,owner,staff,'DELETE'));
  assert.deepEqual(state.requests,[]);
});

test('an audit write failure blocks destructive work', async () => {
  const {db,state}=backend({auditError:{code:'unavailable'}});
  await assert.rejects(()=>remove(db,owner,staff,'DELETE'));
  assert.deepEqual(state.requests,[]);
});

test('an unused disabled staff account is deleted through Auth and the outcome is audited', async () => {
  const {db,state}=backend();
  const result=await remove(db,owner,staff,'DELETE');
  assert.equal(result.ok,true); assert.deepEqual(state.accounts,[]);
  assert.deepEqual(state.requests,[staff.id]);
  assert.equal(state.audit[0].action,'DELETE');
  assert.equal(state.audit[0].actor_id,owner.id);
  assert.equal(state.audit[0].record_id,staff.id);
  assert.deepEqual(state.queryTables.filter(t=>!['tv_inputs','audit_log'].includes(t)),[]);
});

test('linked records or storage are never deleted to force Auth deletion to succeed', async () => {
  const {db,state}=backend({deleteError:{status:422,code:'foreign_key_violation'}});
  await assert.rejects(()=>remove(db,owner,staff,'DELETE'),/linked|retained/i);
  assert.deepEqual(state.accounts,[staff.id]);
  assert.equal(state.audit[0].action,'DELETE_BLOCKED');
  assert.deepEqual(state.queryTables.filter(t=>!['tv_inputs','audit_log'].includes(t)),[]);
});

test('an uncertain network outcome tells staff to reload rather than claiming failure or success', async () => {
  const {db,state}=backend({deleteThrows:true});
  await assert.rejects(()=>remove(db,owner,staff,'DELETE'),/confirmed|reload/i);
  assert.equal(state.audit[0].action,'DELETE_UNCONFIRMED');
});

test('a successful deletion with an audit-completion failure is reported honestly', async () => {
  const {db,state}=backend({completionError:{code:'unavailable'}});
  const result=await remove(db,owner,staff,'DELETE');
  assert.equal(result.ok,true); assert.match(result.warning,/audit/i);
  assert.deepEqual(state.accounts,[]); assert.equal(state.audit[0].action,'DELETE_REQUESTED');
});
