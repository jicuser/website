const normalise = (value) =>
  String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Search only the tasks this staff member is permitted to open. */
export function findAdminTasks(sections, can, search = '') {
  const words = normalise(search).split(/\s+/).filter(Boolean);
  return sections.filter((item) => {
    if (item.id === 'dashboard' || !can(item.permission)) return false;
    const text = normalise(
      [item.name, item.description, item.group, ...(item.keywords || [])].join(' '),
    );
    return words.every((word) => text.includes(word));
  });
}

/** Keep entry links within the destinations available to this staff member. */
export function getAdminEntrySections(sectionIds) {
  const overviewSection = sectionIds.includes('dashboard') ? 'dashboard' : null;
  return {
    defaultSection: overviewSection || sectionIds[0] || 'dashboard',
    overviewSection,
  };
}
