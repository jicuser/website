import { NAV_GROUPS, MADRASSAH_TABS, MASJID_EXTENSION_TABS } from '../content/nav.js';
import { standaloneSections } from '../content/sectionRoutes.js';
import { SOCIAL_CHANNELS } from '../content/socials.js';

const aliases = {
  '/prayer-times': 'salah namaz salat jamaat jamaah timetable today',
  '/prayer-times/jummah': 'juma jumma friday khutbah sermon',
  '/madrassah': 'madrasah madrasa school children education',
  '/youth/itikaf': 'itikaf itikaaf itikaph ramadan',
  '/contact': 'address map directions visit phone email parking',
  '/projects/how-to-support': 'donate donation sadaqah charity building appeal',
  '/radio': 'listen audio live radio stream',
  '/social-media': 'social media facebook instagram youtube tiktok twitter x videos livestream',
};
const pages = new Map();
for (const group of NAV_GROUPS) {
  pages.set(group.path, { title: group.name, path: group.path, section: group.name });
  for (const child of group.children) {
    if (child.path !== group.path && !pages.has(child.path))
      pages.set(child.path, { title: child.name, path: child.path, section: group.name });
  }
}
for (const [path, section, title] of standaloneSections)
  if (!pages.has(`/${path}`)) pages.set(`/${path}`, { path: `/${path}`, title, section });
for (const child of [...MADRASSAH_TABS, ...MASJID_EXTENSION_TABS])
  if (!pages.has(child.path))
    pages.set(child.path, {
      title: child.name === 'Overview' ? 'Madrassah' : child.name,
      path: child.path,
      section: child.path.startsWith('/madrassah') ? 'Madrassah' : 'Building works',
    });
pages.set('/radio', { title: 'JIC Radio', path: '/radio', section: 'Listen live' });
pages.set('/privacy', { title: 'Privacy', path: '/privacy', section: 'Website information' });
for (const channel of SOCIAL_CHANNELS)
  pages.set(`/social-media#${channel.id}`, {
    title: channel.name,
    path: `/social-media#${channel.id}`,
    section: 'Social Media',
    description: channel.description,
  });
export const SEARCH_PAGES = [...pages.values()];

const normalise = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’'‘]/g, '');

/** Search only known public destinations. Queries are text, never SQL or regular expressions. */
export function searchPages(query, entries = SEARCH_PAGES) {
  const words = normalise(query).trim().slice(0, 120).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries
    .map((entry) => {
      const title = normalise(entry.title);
      const haystack = normalise(
        [entry.title, entry.section, entry.description, aliases[entry.path]].join(' '),
      );
      return {
        ...entry,
        score: words.every((word) => haystack.includes(word))
          ? words.reduce((score, word) => score + (title.includes(word) ? 4 : 1), 0)
          : 0,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}
