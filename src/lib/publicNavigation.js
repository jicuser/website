import { GIVING_NAVIGATION, GET_INVOLVED_NAVIGATION, MADRASSAH_TABS, NAV_GROUPS } from '../content/nav.js';
import { canonicalPagePath } from '../content/pageAliases.js';
import { standaloneSections } from '../content/sectionRoutes.js';
import { orderedNavigation } from './navigationConfiguration.js';

const matchesPath = (pathname, path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
const nestedSections = [{ name: 'Madrassah', path: '/madrassah', primaryPath: '/education', children: MADRASSAH_TABS }];

/** Preserve full section identities for breadcrumbs and the existing CMS. */
export function activeNavigation(pathname) {
  pathname = canonicalPagePath(pathname);
  if (matchesPath(pathname, '/donate')) {
    return { ...GIVING_NAVIGATION, primaryPath: '/donate', primaryName: 'Giving', current: { name: 'Donate', path: '/donate' } };
  }
  if (matchesPath(pathname, '/get-involved') || matchesPath(pathname, '/fundraise')) {
    const current = GET_INVOLVED_NAVIGATION.children.filter((page) => matchesPath(pathname, page.path)).sort((a, b) => b.path.length - a.path.length)[0];
    return { ...GET_INVOLVED_NAVIGATION, primaryPath: '/get-involved', primaryName: 'Get involved', current };
  }
  const parentPath = standaloneSections.filter(([path]) => matchesPath(pathname, `/${path}`)).sort((a, b) => b[0].length - a[0].length)[0]?.[3];
  const nested = nestedSections.find((section) => matchesPath(pathname, section.path) || parentPath === section.path);
  const primary = NAV_GROUPS.find((group) => nested ? group.path === nested.primaryPath : matchesPath(pathname, group.path) || group.children.some((child) => matchesPath(pathname, child.path)));
  if (!primary) return null;
  const section = nested || primary;
  if (primary.path === '/projects') {
    return { ...primary, primaryPath: primary.path, primaryName: primary.name, current: primary.children.find((page) => page.path === primary.path) };
  }
  const current = section.children.filter((child) => (matchesPath(pathname, child.path) || child.path === parentPath) && (child.path !== section.path || pathname === section.path || child.path === parentPath)).sort((a, b) => b.path.length - a.path.length)[0];
  return { ...section, primaryPath: primary.path, primaryName: primary.name, current };
}

export function navigationBreadcrumbs(navigation) {
  if (!navigation || navigation.path === '/') return [];
  const candidates = [{ path: navigation.primaryPath, name: navigation.primaryName }, { path: navigation.path, name: navigation.name }, navigation.current];
  const paths = new Set(), names = new Set();
  return candidates.filter((item) => {
    if (!item?.path || !item.name) return false;
    const name = item.name.trim().toLowerCase();
    if (paths.has(item.path) || names.has(name)) return false;
    paths.add(item.path); names.add(name); return true;
  });
}

/** Navigation is a presentation of visible pages, never an access-control change. */
export function compactMenuNavigation(groups) {
  const order = ['/', '/prayer-times', '/services', '/about', '/donate', '/contact'];
  const labels = { '/': 'Home', '/prayer-times': 'Salah timetable', '/services': 'Community Hub', '/about': 'About', '/donate': 'Donate', '/contact': 'Contact Us' };
  const parents = new Map([
    ['/worship', '/services'], ['/education', '/services'], ['/madrassah', '/services'],
    ['/youth', '/services'], ['/get-involved', '/services'], ['/ramadan', '/services'],
    ['/projects', '/about'], ['/social-media', '/about'],
  ]);
  const available = new Map();
  for (const group of groups) {
    for (const child of group.children || []) if (!available.has(child.path)) available.set(child.path, { ...child, children: [] });
  }
  for (const group of groups) available.set(group.path, group);
  const rootOrder = [...new Set([...groups.filter((group) => order.includes(group.path)).map((group) => group.path), ...order])];
  return rootOrder.filter((path) => available.has(path)).map((path) => {
    const group = available.get(path);
    const children = (group.children || []).filter((child) => (child.path === path || !order.includes(child.path)) && !['/services/religious', '/services/education', '/services/community'].includes(child.path));
    const sections = groups.filter((destination) => parents.get(destination.path) === path);
    for (const destination of sections) {
      if (!children.some((child) => child.path === destination.path)) children.push({ name: destination.name, path: destination.path });
    }
    return {
      ...group,
      name: group.customName || path === '/contact' ? group.name : labels[path],
      children: orderedNavigation(children, group.childOrder),
      sectionPaths: [path, ...sections.map((section) => section.path)],
    };
  });
}
