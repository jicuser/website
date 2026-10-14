import { activeNavigation } from './publicNavigation.js';

// Reuse the visitor-facing hierarchy: URL prefixes alone do not connect Contact
// to About, funeral pages to Services, or Madrassah to Education.
export function buildPageNavigator(pages) {
  const sections = new Map();
  for (const page of pages) {
    const navigation = activeNavigation(page.path);
    const section = navigation?.primaryName || page.group;
    const nested = navigation && navigation.name !== navigation.primaryName;
    const label =
      nested && page.path !== navigation.path ? `${navigation.name} · ${page.name}` : page.name;
    if (!sections.has(section)) sections.set(section, { name: section, pages: [] });
    sections.get(section).pages.push({ ...page, section, label });
  }
  return [...sections.values()];
}

const normalise = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’]/g, "'")
    .trim()
    .toLowerCase();

export function findNavigatorPages(sections, query) {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  return sections.flatMap((section) =>
    section.pages.filter((page) => {
      const text = normalise(`${section.name} ${page.label} ${page.path}`);
      return words.every((word) => text.includes(word));
    }),
  );
}
