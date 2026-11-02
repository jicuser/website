/** Catalogue helpers operate only on permission-filtered form summaries. */
export const FORM_GROUPS = [
  ['all', 'All groups'],
  ['madrasah', 'Madrasah'],
  ['education', 'Courses & youth'],
  ['services', 'Contact & services'],
  ['ramadan', 'Ramadan & Itikaf'],
  ['other', 'Other forms'],
];

const rows = (value) => (Array.isArray(value) ? value : []);
const within = (path, section) => path === section || path.startsWith(`${section}/`);
const normalise = (value) => String(value || '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-GB').trim();
const statusOf = (form) => !form?.published_version ? 'Draft' : form.enabled ? 'Live' : 'Closed';

export function formGroups(form, isService = false) {
  const groups = new Set();
  const kind = form?.built_in_kind || form?.kind;
  if (kind === 'madrassah') groups.add('madrasah');
  if (kind === 'itikaaf' || kind === 'itikaf') groups.add('ramadan');
  if (kind === 'contact' || isService) groups.add('services');
  for (const page of rows(form?.pages)) {
    const path = typeof page?.placement === 'string' ? page.placement : '';
    if (within(path, '/madrassah')) groups.add('madrasah');
    if (within(path, '/education') || within(path, '/youth')) groups.add('education');
    if (within(path, '/services')) groups.add('services');
    if (within(path, '/ramadan')) groups.add('ramadan');
  }
  return groups.size ? FORM_GROUPS.map(([id]) => id).filter((id) => groups.has(id)) : ['other'];
}

export function matchesFormSearch(form, search = '') {
  const query = normalise(search);
  if (!query) return true;
  const text = [form?.title, form?.slug, form?.description,
    ...rows(form?.pages).map((page) => page?.title)].map(normalise).join(' ');
  return query.split(/\s+/).every((word) => text.includes(word));
}

export function filterFormLibrary(forms, { group = 'all', search = '', status = 'all' } = {}, isService = () => false) {
  return rows(forms).filter((form) => form &&
    (group === 'all' || formGroups(form, isService(form)).includes(group)) &&
    matchesFormSearch(form, search) && (status === 'all' || statusOf(form) === status));
}

export function formStatusCounts(forms, builtIn = []) {
  const counts = { all: 0, Live: rows(builtIn).length, Draft: 0, Closed: 0 };
  for (const form of rows(forms)) if (form) counts[statusOf(form)] += 1;
  counts.all = counts.Live + counts.Draft + counts.Closed;
  return counts;
}

export function formUsageSummary(form) {
  const pages = rows(form?.pages);
  if (pages.length) {
    const live = pages.filter((page) => page?.published === true).length;
    return `${pages.length} linked ${pages.length === 1 ? 'page' : 'pages'} · ${live ? `${live} published` : 'none published'}`;
  }
  return form?.built_in_kind || form?.kind ? 'Built-in website form' : 'Direct form link';
}
