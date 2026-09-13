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
