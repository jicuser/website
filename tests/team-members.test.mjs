import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupPublishedTeamMembers,
  teamMemberDraft,
  teamMemberPayload,
} from '../src/lib/teamMembers.js';

test('profile drafts preserve editable details and leave database metadata behind', () => {
  const draft = teamMemberDraft({
    id: 'existing',
    name: 'A member',
    role_title: null,
    bio: 'Introduction',
    member_group: 'trustees',
    image_url: 'https://example.com/photo.jpg',
    sort_order: 4,
    published: false,
    updated_at: 'yesterday',
    updated_by: 'someone',
  });
  assert.deepEqual(draft, {
    name: 'A member',
    role_title: '',
    bio: 'Introduction',
    member_group: 'trustees',
    image_url: 'https://example.com/photo.jpg',
    sort_order: 4,
    published: false,
  });
  assert.equal(teamMemberDraft().image_url, '');
});

test('profile saves validate required details even when submitted from the global save button', () => {
  assert.throws(() => teamMemberPayload(teamMemberDraft()), /name/);
  assert.throws(() => teamMemberPayload({ name: 'A member', member_group: 'other' }), /section/);
  for (const sort_order of [1.5, 'invalid', Infinity, 2147483648]) {
    assert.throws(
      () => teamMemberPayload({ name: 'A member', member_group: 'staff', sort_order }),
      /whole number/,
    );
  }
});

test('profile save trims fields, supports removing a photo and does not change publication state', () => {
  const payload = teamMemberPayload({
    name: '  A member ',
    role_title: ' Teacher ',
    bio: ' About the teacher ',
    image_url: '',
    member_group: 'staff',
    sort_order: '2',
    published: false,
    id: 'existing',
  });
  assert.deepEqual(payload, {
    name: 'A member',
    role_title: 'Teacher',
    bio: 'About the teacher',
    image_url: null,
    member_group: 'staff',
    sort_order: 2,
    published: false,
  });
});

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
