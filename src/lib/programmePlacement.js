import { pageName } from '../content/pageDirectory.js';

const groupPage = (group) => (group === 'home' ? '/' : `/${group}`);
export const posterPlacementLabel = (group) => pageName(groupPage(group)) || group;

/** Group selections belong to overview pages; programme pages can add an explicit listing. */
export function posterAppearsOnPage(poster, pathname, pages = []) {
  return (
    pages.some((page) => page.source_poster_id === poster.id && page.placement === pathname) ||
    (poster.groups || []).some((group) => groupPage(group) === pathname)
  );
}
