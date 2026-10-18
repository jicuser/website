import {
  NAV_GROUPS,
  MADRASSAH_TABS,
  MASJID_EXTENSION_TABS,
  GET_INVOLVED_NAVIGATION,
} from './nav.js';
import { standaloneSections } from './sectionRoutes.js';

// Menus can say Overview within a named section. Search and editors need the
// full page name. Keep one entry per address, with the section name taking priority.
const pages = new Map();
function add(page) {
  if (!pages.has(page.path)) pages.set(page.path, page);
}
for (const group of NAV_GROUPS) {
  add({ name: group.name, path: group.path, group: group.name });
  for (const child of group.children) add({ ...child, group: group.name });
}
add({ name: 'Get involved', path: '/get-involved', group: 'Get involved' });
for (const page of GET_INVOLVED_NAVIGATION.children) {
  if (page.path !== '/fundraise/new') add({ ...page, group: 'Get involved' });
}
for (const [group, tabs] of [
  ['Madrassah', MADRASSAH_TABS],
  ['Masjid Building Works', MASJID_EXTENSION_TABS],
]) {
  for (const child of tabs) add({ ...child, group });
}
for (const [path, group, name] of standaloneSections) add({ path: `/${path}`, group, name });

export const PUBLIC_PAGES = [...pages.values()];
export const pageName = (path) => pages.get(path)?.name || '';
