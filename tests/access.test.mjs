import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  hasAdminAccess,
  validateAccess,
  validateDelegation,
  canManageAccount,
} from '../supabase/functions/_shared/access.js';
const person = (permissions = [], extra = {}) => ({
  is_active: true,
  is_owner: false,
  staff_kinds: [],
  permissions,
  ...extra,
});
test('staff labels and metadata never grant capabilities', () => {
  const p = person([], {
    staff_kinds: ['imam', 'teacher'],
    role: 'super_admin',
    user_metadata: { is_owner: true, permissions: ['users'] },
  });
  assert.equal(hasAdminAccess(p), false);
  assert.equal(hasPermission(p, 'users'), false);
  assert.deepEqual(validateAccess({ permissions: [], staff_kinds: ['teacher'] }), {
    permissions: [],
    staff_kinds: ['teacher'],
  });
  assert.equal(hasPermission(person(['forms_madrassah']), 'forms'), true);
  assert.equal(hasPermission(person(['forms_madrassah']), 'forms_contact'), false);
  assert.equal(hasPermission(person(['tv'], { is_active: false }), 'tv'), false);
  assert.equal(hasPermission(person([], { is_owner: true }), 'users'), true);
});
test('delegated managers cannot grant beyond their access or manage owners', () => {
  const manager = person(['users', 'tv']);
  assert.doesNotThrow(() =>
    validateDelegation(
      manager,
      validateAccess({ permissions: ['tv'], staff_kinds: ['volunteer'] }),
    ),
  );
  assert.throws(() => validateDelegation(manager, { permissions: ['users', 'content'] }));
  assert.equal(canManageAccount(manager, person(['tv'])), true);
  assert.equal(canManageAccount(manager, person(['tv', 'content'])), false);
  assert.equal(canManageAccount(manager, person([], { is_owner: true })), false);
  for (const value of [
    { permissions: ['root'], staff_kinds: [] },
    { permissions: ['tv', 'tv'], staff_kinds: [] },
    { permissions: [], staff_kinds: ['super_admin'] },
    { permissions: 'tv', staff_kinds: [] },
  ])
    assert.throws(() => validateAccess(value));
});
