// Older links still open the same page; they must not create a second editor or
// content record for that destination.
export const PAGE_ALIASES = Object.freeze({
  '/projects/timeline': '/projects/masjid-extension/timeline',
  '/projects/madrassah-building': '/projects/madrassah-floor',
});

export function canonicalPagePath(pathname) {
  return PAGE_ALIASES[pathname.replace(/\/+$/, '')] || pathname;
}
