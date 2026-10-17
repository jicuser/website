import { MADRASSAH_TABS, MASJID_EXTENSION_TABS, NAV_GROUPS } from '../content/nav.js';
import { canonicalPagePath } from '../content/pageAliases.js';

const matchesPath = (pathname, path) =>
  pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

const nestedSections = [
  { name: 'Madrassah', path: '/madrassah', primaryPath: '/education', children: MADRASSAH_TABS },
  {
    name: 'Our Masjid Project',
    path: '/projects/masjid-extension',
    primaryPath: '/projects',
    children: MASJID_EXTENSION_TABS,
  },
];

// Child destinations can live outside the parent URL (for example About → Contact).
// Use the same section identity for desktop highlights, mobile breadcrumbs and menus.
export function activeNavigation(pathname) {
  pathname = canonicalPagePath(pathname);
  const nested = nestedSections.find(
    (section) =>
      matchesPath(pathname, section.path) ||
      section.children.some(
        (child) => child.path !== section.primaryPath && matchesPath(pathname, child.path),
      ),
  );
  const primary = NAV_GROUPS.find((group) =>
    nested
      ? group.path === nested.primaryPath
      : matchesPath(pathname, group.path) ||
        group.children.some((child) => matchesPath(pathname, child.path)),
  );
  if (!primary) return null;
  const section = nested || primary;
  const current = section.children
    .filter(
      (child) =>
        matchesPath(pathname, child.path) &&
        (child.path !== section.path || pathname === section.path),
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
  return { ...section, primaryPath: primary.path, primaryName: primary.name, current };
}
