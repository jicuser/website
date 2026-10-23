// Keep the original page addresses as content keys and shared-link destinations.
// Visitors reach each part of the same About page through its anchor.
export const ABOUT_SECTIONS = [
  { path: '/about/history', id: 'history', name: 'Our story' },
  { path: '/team', id: 'team', name: 'Our people' },
  { path: '/financial-history', id: 'finances', name: 'Finances' },
  { path: '/social-media', id: 'social', name: 'Stay connected' },
  { path: '/contact', id: 'contact', name: 'Visit & contact' },
];

export const ABOUT_PATHS = ['/about', ...ABOUT_SECTIONS.map(({ path }) => path)];

export function aboutSectionLink(path, hash = '') {
  const section = ABOUT_SECTIONS.find((item) => item.path === path);
  return section ? `/about${hash || `#${section.id}`}` : path;
}
