/** Only these identifiers may be persisted; display colours never come from input CSS. */
export const TV_THEME_KEYS = ['midnight', 'pearl', 'forest'];

export const tvThemeId = (value) => TV_THEME_KEYS.includes(value) ? value : 'midnight';

/** TV-only palettes. Keep this catalogue out of the public website entry bundle. */
export const TV_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep navy with warm gold and clear white text.',
    colorScheme: 'dark',
    colors: {
      background: '#080f1d', surface: '#10263a', raised: '#17354c',
      text: '#f7f8fa', muted: '#c4d0dd', accent: '#f3ce86',
      border: '#5c7186', highlight: '#294453', highlightText: '#ffffff',
    },
  },
  {
    id: 'pearl',
    name: 'Pearl',
    description: 'A soft light background with navy text and bronze gold.',
    colorScheme: 'light',
    colors: {
      background: '#f5f3ea', surface: '#fffdf7', raised: '#e7edf2',
      text: '#14283d', muted: '#42556b', accent: '#784819',
      border: '#9aa9b8', highlight: '#e4d4b1', highlightText: '#14283d',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Calm deep green with pale text and gentle gold.',
    colorScheme: 'dark',
    colors: {
      background: '#081e18', surface: '#10382c', raised: '#184637',
      text: '#f5f9f4', muted: '#c4d8ca', accent: '#efd19a',
      border: '#527565', highlight: '#285843', highlightText: '#ffffff',
    },
  },
];

export const tvTheme = (value) => TV_THEMES.find(({ id }) => id === tvThemeId(value));

/** Inline values come exclusively from the fixed catalogue above. */
export function tvThemeStyle(value) {
  const { colors, colorScheme } = tvTheme(value);
  return {
    colorScheme,
    ...Object.fromEntries(Object.entries(colors).map(([key, color]) => [`--tv-${key}`, color])),
    '--jic-bg': colors.background,
    '--jic-bg-secondary': colors.raised,
    '--jic-surface': colors.surface,
    '--jic-text': colors.text,
    '--jic-text-secondary': colors.muted,
    '--jic-muted': colors.muted,
    '--jic-gold': colors.accent,
    '--jic-gold-strong': colors.accent,
    '--jic-border': colors.border,
    '--jic-glass-border': colors.border,
  };
}
