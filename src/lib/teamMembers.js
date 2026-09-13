export const TEAM_GROUPS = [
  {
    value: 'founder_members',
    label: 'Founder members',
    description: 'The founder members who began Jamatia Islamic Centre in 1979.',
  },
  {
    value: 'management_committee',
    label: 'Management committee',
    description: 'Meet the management committee serving the centre and its community.',
  },
  {
    value: 'trustees',
    label: 'Trustees',
    description: 'Meet the trustees of Jamatia Islamic Centre.',
  },
  {
    value: 'staff',
    label: 'Staff',
    description: 'Meet the staff serving the centre and its community.',
  },
];

const groupValues = new Set(TEAM_GROUPS.map(({ value }) => value));

export function teamMemberDraft(member = {}) {
  return {
    name: member.name || '',
    role_title: member.role_title || '',
    bio: member.bio || '',
    image_url: member.image_url || '',
    member_group: member.member_group || '',
    sort_order: member.sort_order ?? 0,
    published: member.published ?? true,
  };
}

export function teamMemberPayload(form) {
  const draft = teamMemberDraft(form);
  if (!draft.name.trim()) throw new Error('Add a name first.');
  if (!groupValues.has(draft.member_group)) throw new Error('Choose a team section.');
  const order = Number(draft.sort_order);
  if (!Number.isSafeInteger(order) || order < -2147483648 || order > 2147483647) {
    throw new Error('Display order must be a whole number.');
  }
  return {
    ...draft,
    name: draft.name.trim(),
    role_title: draft.role_title.trim(),
    bio: draft.bio.trim(),
    image_url: draft.image_url || null,
    sort_order: order,
  };
}

export function groupPublishedTeamMembers(members) {
  const groups = Object.fromEntries(TEAM_GROUPS.map(({ value }) => [value, []]));
  const unassigned = [];

  for (const member of members) {
    if (member.published !== true) continue;
    // Keep older profiles visible without guessing a person's membership from their title.
    const destination = groupValues.has(member.member_group)
      ? groups[member.member_group]
      : unassigned;
    destination.push(member);
  }

  return { groups, unassigned };
}
