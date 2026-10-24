/** Promote useful destinations only when the CMS has made them visible. */
export function drawerNavigation(directoryGroups, visibleGroups) {
  const available = new Map();
  for (const group of visibleGroups) {
    available.set(group.path, group);
    for (const child of group.children || []) {
      if (!available.has(child.path)) available.set(child.path, { ...child, children: [] });
    }
  }
  // A root contains the full section model; prefer it to a link from another group.
  for (const group of visibleGroups) available.set(group.path, group);
  const result = [];
  const seen = new Set();
  const add = (group) => {
    if (!group || seen.has(group.path)) return;
    seen.add(group.path);
    result.push({ ...group, children: [...(group.children || [])] });
  };
  for (const group of directoryGroups) {
    if (group.path === '/services') add(available.get('/education'));
    if (group.path === '/about') {
      add(available.get('/projects'));
      add(available.get('/donate'));
    }
    add(group);
    if (group.path === '/prayer-times') {
      add(available.get('/funerals'));
      add(available.get('/services/nikah'));
    }
    if (group.path === '/about') add(available.get('/contact'));
  }
  // A hidden parent must not hide an otherwise-visible promoted destination.
  for (const path of ['/funerals', '/services/nikah', '/education', '/projects', '/donate', '/contact']) {
    add(available.get(path));
  }
  return result.map((group) => ({
    ...group,
    children: group.children.filter((child) => child.path === group.path || !seen.has(child.path)),
  }));
}

/** Use the most specific destination, so Nikah does not also highlight the Hub. */
export function activeDrawerPath(groups, pathname) {
  const current = pathname.replace(/\/+$/, '') || '/';
  let active;
  let length = -1;
  for (const group of groups) {
    for (const item of [group, ...(group.children || [])]) {
      const matches = current === item.path || (item.path !== '/' && current.startsWith(`${item.path}/`));
      if (matches && item.path.length > length) {
        active = group.path;
        length = item.path.length;
      }
    }
  }
  return active;
}
