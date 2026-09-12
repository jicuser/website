import { PROGRAMMES } from '../content/programmes.js';
import { TV_REMINDERS } from '../content/tvReminders.js';

export const POSTERS_KEY = 'programme_posters';
export const ANNOUNCEMENTS_ID = 'community-announcements';
export const POSTER_DESTINATIONS = [
  'home',
  'worship',
  'education',
  'youth',
  'madrassah',
  'services',
  'about',
];
export const DEFAULT_ANNOUNCEMENTS = {
  id: ANNOUNCEMENTS_ID,
  kind: 'announcement',
  title: 'Announcements',
  body: TV_REMINDERS.join('\n\n'),
  images: [],
  groups: [],
  to: '/contact',
};
export const DEFAULT_POSTERS = [
  ...PROGRAMMES.slice(0, 3),
  DEFAULT_ANNOUNCEMENTS,
  ...PROGRAMMES.slice(3),
];

export function posterImage(value) {
  if (
    typeof value !== 'string' ||
    value.length > 2000 ||
    [...value].some((char) => char.charCodeAt(0) <= 32) ||
    value.includes('\\')
  )
    return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function validPoster(poster) {
  return Boolean(
    poster &&
    typeof poster.id === 'string' &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(poster.id) &&
    typeof poster.title === 'string' &&
    poster.title.trim() &&
    poster.title.length <= 200 &&
    (poster.kind === 'announcement'
      ? typeof poster.body === 'string' &&
        poster.body.trim() &&
        poster.body.length <= 800 &&
        poster.body.split('\n').filter((line) => line.trim()).length <= 10 &&
        Array.isArray(poster.images) &&
        poster.images.length <= 2 &&
        poster.images.every(posterImage)
      : posterImage(poster.image)),
  );
}
export function posterCatalogue(raw) {
  try {
    const items = raw == null ? DEFAULT_POSTERS : JSON.parse(raw);
    if (!Array.isArray(items)) return DEFAULT_POSTERS;
    const ids = new Set();
    return items
      .filter((p) => {
        if (!validPoster(p) || ids.has(p.id)) return false;
        ids.add(p.id);
        return true;
      })
      .slice(0, 100)
      .map((p) => ({
        ...p,
        groups: Array.isArray(p.groups)
          ? p.groups.filter((group) => POSTER_DESTINATIONS.includes(group))
          : [],
        to: typeof p.to === 'string' && /^\/(?!\/)[^\\]*$/.test(p.to) ? p.to : '/contact',
      }));
  } catch {
    return DEFAULT_POSTERS;
  }
}
// The fifth item is the incoming poster, so the whole row can move one place.
export function posterWindow(posters, offset, count = 4, incoming = false) {
  if (!posters.length) return [];
  const slots = Math.min(count, posters.length);
  return Array.from(
    { length: slots + (incoming && posters.length > 1 ? 1 : 0) },
    (_, index) => posters[(((offset + index) % posters.length) + posters.length) % posters.length],
  );
}
