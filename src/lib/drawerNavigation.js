import { canonicalPagePath } from '../content/pageAliases.js';

/** Keep the mobile drawer's six ordinary rows separate from its section shortcuts. */
export function drawerNavigation(directoryGroups) {
  const seen = new Set();
  return directoryGroups.filter((group) => {
    if (seen.has(group.path)) return false;
    seen.add(group.path);
    return true;
  }).map((group) => ({ ...group, children: [...(group.children || [])] }));
}

/** Use the original visible sections so a hidden section cannot be promoted from a cross-link. */
export function drawerShortcuts(menuGroups) {
  const hints = { '/worship': 'Use online', '/education': 'Classes at JIC' };
  return menuGroups
    .filter((group) => Object.hasOwn(hints, group.path))
    .map((group) => ({ ...group, children: [...(group.children || [])], hint: hints[group.path] }));
}

/** Resolve merged sections and their descendants without highlighting unrelated roots. */
export function activeDrawerPath(groups, pathname) {
  const current = canonicalPagePath(pathname.replace(/\/+$/, '') || '/');
  let active;
  let length = -1;
  for (const group of groups) {
    for (const item of [group, ...(group.children || []), ...(group.sectionPaths || []).map((path) => ({ path }))]) {
      const matches = current === item.path || (item.path !== '/' && current.startsWith(`${item.path}/`));
      if (matches && item.path.length > length) { active = group.path; length = item.path.length; }
    }
  }
  return active;
}
