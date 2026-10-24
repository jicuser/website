export const SITE_DESIGN_KEY = 'site_design';
export const DESIGN_PAGES = ['/', '/services', '/worship', '/education', '/events'];
export const DESIGN_PALETTES = ['navy-gold', 'forest', 'slate'];
export const DESIGN_ICONS = [
  'support',
  'heart',
  'graduation',
  'book',
  'sparkles',
  'users',
  'calendar',
];
export const DEFAULT_SITE_DESIGN = {
  palette: 'navy-gold',
  layout: 'compact',
  pages: {},
  icons: {},
};
const palette = (value) => DESIGN_PALETTES.includes(value);
const layout = (value) => ['compact', 'list'].includes(value);
export function normaliseSiteDesign(raw) {
  let value;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {}
  value ||= {};
  return {
    palette: palette(value.palette) ? value.palette : 'navy-gold',
    layout: layout(value.layout) ? value.layout : 'compact',
    pages: Object.fromEntries(
      Object.entries(value.pages || {})
        .filter(([path]) => DESIGN_PAGES.includes(path))
        .map(([path, overrides]) => [
          path,
          {
            ...(palette(overrides?.palette) ? { palette: overrides.palette } : {}),
            ...(layout(overrides?.layout) ? { layout: overrides.layout } : {}),
          },
        ]),
    ),
    icons: Object.fromEntries(
      Object.entries(value.icons || {}).filter(
        ([id, icon]) =>
          [
            'support',
            'nikah',
            'funerals',
            'learning',
            'careers',
            'youth',
            'community',
            'hall',
          ].includes(id) && DESIGN_ICONS.includes(icon),
      ),
    ),
  };
}
export const siteDesign = (getContent) => normaliseSiteDesign(getContent(SITE_DESIGN_KEY, '{}'));
export const designForPage = (design, path) => ({
  palette: design.palette,
  layout: design.layout,
  ...design.pages[path],
});
