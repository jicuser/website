import test from 'node:test';
import assert from 'node:assert/strict';
import { findAdminTasks } from '../src/features/admin/taskNavigation.js';
const sections = [
  { id: 'dashboard', permission: 'dashboard', name: 'Home' },
  { id: 'prayer', permission: 'prayer_times', name: 'Prayer times', group: 'Prayer times' },
  { id: 'tv', permission: 'tv', name: 'TV screens', group: 'TV screens' },
  { id: 'forms', permission: 'forms', name: 'Forms', group: 'Forms & requests' },
  { id: 'users', permission: 'users', name: 'People & access', group: 'Staff & records' },
];
test('change Asr Jamaat opens the prayer editor', () => assert.deepEqual(findAdminTasks(sections, () => true, 'change Asr Jamaat').map(x => x.id), ['prayer']));
test('change TV layout opens TV screens', () => assert.deepEqual(findAdminTasks(sections, () => true, 'change TV layout').map(x => x.id), ['tv']));
test('create a form opens forms', () => assert.deepEqual(findAdminTasks(sections, () => true, 'create a form').map(x => x.id), ['forms']));
test('add staff member opens people and access', () => assert.deepEqual(findAdminTasks(sections, () => true, 'add staff member').map(x => x.id), ['users']));
test('staff cannot search for tools without permission', () => assert.deepEqual(findAdminTasks(sections, p => p === 'forms', 'change Asr Jamaat'), []));
