import { PUBLIC_PAGES } from './pageDirectory.js';
import { standaloneSections } from './sectionRoutes.js';
import { IMAGES } from './images.js';
import { canonicalPagePath } from './pageAliases.js';

export const EDITABLE_PAGES = PUBLIC_PAGES;
export const pageKey = (path) => `page:${canonicalPagePath(path)}`;
export function editablePagePath(path) {
  const canonicalPath = canonicalPagePath(path);
  return EDITABLE_PAGES.some((page) => page.path === canonicalPath) ? canonicalPath : '/';
}
export const mainContentPaths = new Set([
  ...standaloneSections.map(([path]) => `/${path}`),
  '/services/support',
  '/services/marriage-family',
  '/services/skills-careers',
  '/services/community',
]);
export const supplementalContentPaths = new Set(
  PUBLIC_PAGES.filter((page) => page.path !== '/' && !mainContentPaths.has(page.path)).map(
    (page) => page.path,
  ),
);
export const pageDefaults = (page) =>
  page.path === '/'
    ? {
        title: 'A place for faith.\nA home for community.',
        body: 'Worship. Learn. Grow. Together.\nA stronger community for a brighter tomorrow.',
        image: IMAGES.homeHero,
      }
    : { title: supplementalContentPaths.has(page.path) ? '' : page.name, body: '', image: '' };
