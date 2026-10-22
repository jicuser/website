import { pageName } from '../content/pageDirectory.js';
import { POSTER_DESTINATIONS, POSTER_WEBSITE_LOCATIONS } from './posters.js';

const groupPage = (group) => (group === 'home' ? '/' : `/${group}`);
export const posterPlacementLabel = (group) =>
  group === 'home' ? 'What’s on (homepage)' : pageName(groupPage(group)) || group;
export const posterWebsiteLocationLabel = (path) =>
  path === '/' ? 'What’s on (homepage)' : pageName(path) || path;

/** Older catalogues inherit linked page listings until staff explicitly choose poster locations. */
export function posterWebsiteLocations(poster, pages = []) {
  if (Array.isArray(poster.website_locations))
    return [
      ...new Set(
        poster.website_locations.filter((path) => POSTER_WEBSITE_LOCATIONS.includes(path)),
      ),
    ];
  return [
    ...new Set([
      ...(poster.groups || [])
        .filter((group) => POSTER_DESTINATIONS.includes(group))
        .map(groupPage),
      ...(poster.image ? ['/social-media'] : []),
      ...pages
        .filter((page) => page.source_poster_id === poster.id && page.published !== false)
        .map((page) => page.placement),
    ]),
  ].filter((path) => POSTER_WEBSITE_LOCATIONS.includes(path));
}

/** Explicit selections govern poster visibility; legacy groups and linked pages remain compatible. */
export function posterAppearsOnPage(poster, pathname, pages = []) {
  return posterWebsiteLocations(poster, pages).includes(pathname);
}
