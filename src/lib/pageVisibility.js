import { PUBLIC_PAGES } from '../content/pageDirectory.js';
import { canonicalPagePath } from '../content/pageAliases.js';
import {
  NAVIGATION_CONTENT_KEY,
  presentNavigation,
  readNavigationConfiguration,
} from './navigationConfiguration.js';

export const pageVisibilityKey = (path) =>
  `page-visibility:${canonicalPagePath(path.split(/[?#]/)[0].replace(/\/+$/, '') || '/')}`;
export function isPageEnabled(getContent, path) {
  if (['/', '/privacy', '/services/support'].includes(path.split(/[?#]/)[0])) return true;
  return getContent(pageVisibilityKey(path), 'true') !== 'false';
}
export function isPageVisible(getContent, path) {
  if (['/', '/privacy', '/services/support'].includes(path.split(/[?#]/)[0])) return true;
  if (path.startsWith('/ramadan/') && getContent(pageVisibilityKey('/ramadan'), 'true') === 'false')
    return false;
  return isPageEnabled(getContent, path);
}
export const pageSectionKey = (path) =>
  pageVisibilityKey(path).replace('page-visibility:', 'page-section:');
export function configuredNavigation(groups, getContent, addedPages = []) {
  const roots = new Set(groups.map((group) => group.path));
  const target = (path) => {
    const section = getContent(pageSectionKey(path), '');
    return !roots.has(path) && roots.has(section) ? section : '';
  };
  const configured = groups.map((group) => {
    const children = (group.children || []).filter(
      (page) => !target(page.path) || target(page.path) === group.path,
    );
    for (const page of PUBLIC_PAGES) {
      if (target(page.path) === group.path && !children.some((child) => child.path === page.path))
        children.push({ name: page.name, path: page.path });
    }
    for (const page of addedPages) {
      const destination = roots.has(page.placement)
        ? page.placement
        : groups.find((candidate) =>
            candidate.children?.some((child) => child.path === page.placement),
          )?.path;
      if (destination !== group.path || !/^[a-z0-9-]+$/.test(page.slug || '') || !page.title)
        continue;
      const path = `/pages/${page.slug}`;
      if (!children.some((child) => child.path === path)) children.push({ name: page.title, path });
    }
    return { ...group, children };
  });
  return presentNavigation(
    configured,
    readNavigationConfiguration(getContent(NAVIGATION_CONTENT_KEY, '{}')),
  );
}
export function visibleNavigation(groups, getContent, addedPages) {
  return configuredNavigation(groups, getContent, addedPages)
    .filter((group) => isPageVisible(getContent, group.path))
    .map((group) => ({
      ...group,
      children: group.children.filter((page) => isPageVisible(getContent, page.path)),
    }));
}
