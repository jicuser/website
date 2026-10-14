import { activeNavigation } from './publicNavigation.js';
import { PUBLIC_MENU_GROUPS } from '../content/nav.js';

// Match the complete public menu. Give explicit menu shortcuts their own group,
// then use route metadata to connect Contact/About and funeral pages/Services.
export function buildPageNavigator(pages) {
  const sections = new Map(
    PUBLIC_MENU_GROUPS.map(({ name, path }) => [name, { name, path, pages: [] }]),
  );
  for (const page of pages) {
    const navigation = activeNavigation(page.path);
    const shortcut =
      PUBLIC_MENU_GROUPS.find((group) => group.path === page.path) ||
      PUBLIC_MENU_GROUPS.find(
        (group) => group.path === '/madrassah' && page.path.startsWith('/madrassah/'),
      );
    const section = shortcut?.name || navigation?.primaryName || page.group;
    const nested = !shortcut && navigation && navigation.name !== navigation.primaryName;
    const label =
      nested && page.path !== navigation.path ? `${navigation.name} · ${page.name}` : page.name;
    if (!sections.has(section)) sections.set(section, { name: section, pages: [] });
    sections.get(section).pages.push({ ...page, section, label });
  }
  return [...sections.values()].filter((section) => section.pages.length);
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
