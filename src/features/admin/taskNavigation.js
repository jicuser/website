const normalise = (value) =>
  String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Common staff requests route to the existing permission-checked editor, not a write action. */
const ACTION_INTENTS = [
  { id: 'prayer', pattern: /\b(asr|fajr|dhuhr|zuhr|maghrib|isha|jamaat|jamaah|iqamah|adhan|azan|salah)\b/ },
  { id: 'tv', pattern: /\b(tv|screen|display|scene|broadcast)\b/ },
  { id: 'forms', pattern: /\b(form|forms|response|responses|questionnaire|application)\b/ },
  { id: 'users', pattern: /\b(staff|teacher account|user|member|volunteer|permission|login)\b/ },
];

/** Search only tasks permitted to this account; action queries navigate, never mutate. */
export function findAdminTasks(sections, can, search = '') {
  const cleaned = normalise(search);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const isAction = /\b(add|create|make|change|edit|update|set|manage|remove|delete|show|publish|assign|open|find|new)\b/.test(cleaned);
  const intent = isAction ? ACTION_INTENTS.find(({ pattern }) => pattern.test(cleaned)) : null;
  return sections.filter((item) => {
    if (item.id === 'dashboard' || !can(item.permission)) return false;
    if (intent) return item.id === intent.id;
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
