/** The mobile drawer uses the same compact roots as the desktop menu. */
export function drawerNavigation(directoryGroups) {
  const seen = new Set();
  return directoryGroups.filter((group) => {
    if (seen.has(group.path)) return false;
    seen.add(group.path);
    return true;
  }).map((group) => ({ ...group, children: [...(group.children || [])] }));
}

/** Resolve merged sections and their descendants without highlighting unrelated roots. */
export function activeDrawerPath(groups, pathname) {
  const current = pathname.replace(/\/+$/, '') || '/';
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
