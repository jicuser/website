import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPublishedTeamMembers } from '../src/lib/teamMembers.js';

test('team profiles use their assigned group and preserve the provided display order', () => {
  const members = [
    { id: 'first', published: true, member_group: 'trustees' },
    { id: 'second', published: true, member_group: 'founder_members' },
    { id: 'third', published: true, member_group: 'trustees' },
    { id: 'fourth', published: true, member_group: 'management_committee' },
    { id: 'fifth', published: true, member_group: 'staff' },
  ];
  const { groups, unassigned } = groupPublishedTeamMembers(members);
  assert.deepEqual(
    groups.trustees.map(({ id }) => id),
    ['first', 'third'],
  );
  assert.equal(groups.founder_members[0].id, 'second');
  assert.equal(groups.management_committee[0].id, 'fourth');
  assert.equal(groups.staff[0].id, 'fifth');
  assert.deepEqual(unassigned, []);
});

test('legacy profiles stay visible without inferring group membership from a role title', () => {
  const members = [
    { id: 'legacy', published: true, role_title: 'Trustee', member_group: null },
    { id: 'missing', published: true, role_title: 'Founder member' },
    { id: 'unknown', published: true, member_group: 'other' },
  ];
  const { groups, unassigned } = groupPublishedTeamMembers(members);
  assert.equal(Object.values(groups).flat().length, 0);
  assert.deepEqual(unassigned, members);
});

test('unpublished profiles cannot appear in a group or the unassigned list', () => {
  const { groups, unassigned } = groupPublishedTeamMembers([
    { id: 'draft', published: false, member_group: 'founder_members' },
    { id: 'legacy-draft', published: false, member_group: null },
  ]);
  assert.equal(Object.values(groups).flat().length, 0);
  assert.deepEqual(unassigned, []);
});
