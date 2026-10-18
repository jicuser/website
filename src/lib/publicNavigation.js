import { GIVING_NAVIGATION, MADRASSAH_TABS, NAV_GROUPS } from '../content/nav.js';
import { canonicalPagePath } from '../content/pageAliases.js';
import { standaloneSections } from '../content/sectionRoutes.js';

const matchesPath = (pathname, path) =>
  pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

const nestedSections = [
  { name: 'Madrassah', path: '/madrassah', primaryPath: '/education', children: MADRASSAH_TABS },
];

// Child destinations can live outside the parent URL (for example About → Contact).
// Use the same section identity for desktop highlights, mobile breadcrumbs and menus.
export function activeNavigation(pathname) {
  pathname = canonicalPagePath(pathname);
  if (matchesPath(pathname, '/donate') || matchesPath(pathname, '/fundraise')) {
    const current = GIVING_NAVIGATION.children.find(
      (page) =>
        page.path === (matchesPath(pathname, '/fundraise/new') ? '/fundraise/new' : '/donate'),
    );
    return { ...GIVING_NAVIGATION, primaryPath: '/donate', primaryName: 'Giving', current };
  }
  // Retained stage URLs can be siblings of their section after menus are simplified.
  const parentPath = standaloneSections
    .filter(([path]) => matchesPath(pathname, `/${path}`))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[3];
  const nested = nestedSections.find(
    (section) => matchesPath(pathname, section.path) || parentPath === section.path,
  );
  const primary = NAV_GROUPS.find((group) =>
    nested
      ? group.path === nested.primaryPath
      : matchesPath(pathname, group.path) ||
        group.children.some((child) => matchesPath(pathname, child.path)),
  );
  if (!primary) return null;
  const section = nested || primary;
  // Both project overview URLs render the same timeline. Keep one visible destination.
  if (primary.path === '/projects') {
    return {
      ...primary,
      primaryPath: primary.path,
      primaryName: primary.name,
      current: primary.children.find((page) => page.path === primary.path),
    };
  }
  const current = section.children
    .filter(
      (child) =>
        (matchesPath(pathname, child.path) || child.path === parentPath) &&
        (child.path !== section.path || pathname === section.path || child.path === parentPath),
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
  return { ...section, primaryPath: primary.path, primaryName: primary.name, current };
}

export function navigationBreadcrumbs(navigation) {
  if (!navigation || navigation.path === '/') return [];
  const candidates = [
    { path: navigation.primaryPath, name: navigation.primaryName },
    { path: navigation.path, name: navigation.name },
    navigation.current,
  ];
  const paths = new Set(),
    names = new Set();
  return candidates.filter((item) => {
    if (!item?.path || !item.name) return false;
    const name = item.name.trim().toLowerCase();
    if (paths.has(item.path) || names.has(name)) return false;
    paths.add(item.path);
    names.add(name);
    return true;
  });
}
