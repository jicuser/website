import { PUBLIC_PAGES } from './pageDirectory.js';
import { standaloneSections } from './sectionRoutes.js';
import { IMAGES } from './images.js';

export const EDITABLE_PAGES = PUBLIC_PAGES;
export const pageKey = (path) => `page:${path}`;
const mainContentPaths = new Set(standaloneSections.map(([path]) => `/${path}`));
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
