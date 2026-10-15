import { PUBLIC_PAGES } from '../content/pageDirectory.js';
import { canonicalPagePath } from '../content/pageAliases.js';

export const pageVisibilityKey = (path) =>
  `page-visibility:${canonicalPagePath(path.split(/[?#]/)[0].replace(/\/+$/, '') || '/')}`;
export function isPageVisible(getContent, path) {
  if (['/', '/privacy'].includes(path.split(/[?#]/)[0])) return true;
  return getContent(pageVisibilityKey(path), 'true') !== 'false';
}
export const pageSectionKey = (path) =>
  pageVisibilityKey(path).replace('page-visibility:', 'page-section:');
export function configuredNavigation(groups, getContent) {
  const roots = new Set(groups.map((group) => group.path));
  const target = (path) => {
    const section = getContent(pageSectionKey(path), '');
    return !roots.has(path) && roots.has(section) ? section : '';
  };
  return groups.map((group) => {
    const children = (group.children || []).filter(
      (page) => !target(page.path) || target(page.path) === group.path,
    );
    for (const page of PUBLIC_PAGES) {
      if (target(page.path) === group.path && !children.some((child) => child.path === page.path))
        children.push({ name: page.name, path: page.path });
    }
    return { ...group, children };
  });
}
export function visibleNavigation(groups, getContent) {
  return configuredNavigation(groups, getContent)
    .filter((group) => isPageVisible(getContent, group.path))
    .map((group) => ({
      ...group,
      children: group.children.filter((page) => isPageVisible(getContent, page.path)),
    }));
}
