import { hasPermission } from './access.js';
import { newScene, validateScenes } from './tv-scenes.js';
export const TV_SCREENS = [
  { id: 'mens-main', label: 'Men’s Main Hall' },
  { id: 'mens-upstairs', label: 'Men’s Upstairs Hall' },
  { id: 'ladies-upstairs', label: 'Ladies’ Upstairs Hall' },
  { id: 'shoe-area', label: 'Shoe Area' },
];
export const POSTER_IDS = [
  'open-quran-circle',
  'youth-islamic-studies',
  'seekers-gateway',
  'after-maghrib',
];
export const DEFAULT_TV_SETTINGS = {
  version: 2,
  scene_mode: 'normal',
  class_until: '',
  scenes: [newScene()],
  active_scene_id: 'scene-1',
  poster_ids: POSTER_IDS,
  include_events: true,
  rotation_seconds: 20,
  muted: true,
  prayer_enabled: true,
  show_times: true,
  show_next: true,
  show_clock: true,
  ramadan_calendar: 'auto',
  calendar_offset: 0,
  auto_jummah: true,
  notice_mode: 'off',
  jummah_notice:
    'Welcome to Jumu‘ah. Please silence your phone, make room for others and listen quietly during the khutbah.',
  taraweeh_dua: '',
};
export function normaliseTvSettings(settings = {}) {
  return { ...DEFAULT_TV_SETTINGS, ...settings };
}
export function screenExists(id) {
  return TV_SCREENS.some((screen) => screen.id === id);
}
export function secureStreamUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048)
    throw new Error('Enter a valid HTTPS stream URL.');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Enter a valid HTTPS stream URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('Use HTTPS without a username, password or fragment in the URL.');
  }
  return url.href;
}
export function youtubeUrl(raw) {
  const href = secureStreamUrl(raw);
  const url = new URL(href);
  const id =
    url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.searchParams.get('v') ||
        (/^\/(live|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : '');
  if (
    !['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) ||
    !/^[\w-]{11}$/.test(id)
  )
    throw new Error('Enter a YouTube video or live link.');
  return href;
}
export function validateSettings(input, screenId = '') {
  if (!input || typeof input !== 'object') throw new Error('Screen settings are required.');
  const values = normaliseTvSettings(input);
  const result = { version: 2 };
  if (!['normal', 'teaching'].includes(values.scene_mode))
    throw new Error('Choose Normal or Class / Teach.');
  result.scene_mode = values.scene_mode;
  for (const key of [
    'include_events',
    'muted',
    'prayer_enabled',
    'show_times',
    'show_next',
    'show_clock',
    'auto_jummah',
  ]) {
    if (typeof values[key] !== 'boolean') throw new Error('Invalid display switch.');
    result[key] = values[key];
  }
  if (
    !['auto', 'on', 'off'].includes(values.ramadan_calendar) ||
    !Number.isInteger(values.calendar_offset) ||
    Math.abs(values.calendar_offset) > 2
  )
    throw new Error('Choose a valid Ramadan calendar.');
  result.ramadan_calendar = values.ramadan_calendar;
  result.calendar_offset = values.calendar_offset;
  if (!['off', 'jummah', 'taraweeh'].includes(values.notice_mode))
    throw new Error('Choose a valid notice.');
  result.notice_mode = values.notice_mode;
  for (const key of ['jummah_notice', 'taraweeh_dua']) {
    if (typeof values[key] !== 'string' || values[key].length > 1200)
      throw new Error('Use up to 1200 characters per notice.');
    result[key] = values[key].trim();
  }
  if (
    typeof values.class_until !== 'string' ||
    (values.class_until &&
      (!Number.isFinite(Date.parse(values.class_until)) ||
        Date.parse(values.class_until) > Date.now() + 8 * 3600000))
  )
    throw new Error('Choose an end within eight hours, or return to Normal manually.');
  result.class_until = values.class_until;
  if (!Array.isArray(values.poster_ids) || values.poster_ids.some((id) => !POSTER_IDS.includes(id)))
    throw new Error('Unknown poster.');
  result.poster_ids = [...new Set(values.poster_ids)];
  if (!result.poster_ids.length && !result.include_events)
    throw new Error('Keep a poster or upcoming events for fallback.');
  if (
    !Number.isInteger(values.rotation_seconds) ||
    values.rotation_seconds < 5 ||
    values.rotation_seconds > 300
  )
    throw new Error('Use 5–300 seconds between posters.');
  result.rotation_seconds = values.rotation_seconds;
  result.scenes = validateScenes(values.scenes, secureStreamUrl, youtubeUrl);
  if (!result.scenes.some((s) => s.id === values.active_scene_id))
    throw new Error('Choose a saved scene.');
  result.active_scene_id = values.active_scene_id;
  if (screenId === 'shoe-area')
    Object.assign(result, {
      scene_mode: 'normal',
      class_until: '',
      scenes: [newScene()],
      active_scene_id: 'scene-1',
      prayer_enabled: false,
      notice_mode: 'off',
      ramadan_calendar: 'off',
      auto_jummah: false,
    });
  return result;
}
export function publicSettings(input, paired = false) {
  const normalised = normaliseTvSettings(input);
  const settings = Object.fromEntries(
    Object.keys(DEFAULT_TV_SETTINGS).map((key) => [key, normalised[key]]),
  );
  // The unapproved page gets public posters only. Private class text, links and input IDs never leak.
  if (!paired) return { ...settings, scenes: [newScene()], active_scene_id: 'scene-1' };
  return settings;
}
export function tvScene(settings = {}, now = Date.now()) {
  return settings.scene_mode === 'teaching' &&
    (!settings.class_until || Date.parse(settings.class_until) > now)
    ? 'teaching'
    : 'normal';
}
export const isTvStaff = (profile) => hasPermission(profile, 'tv');
export function validDescription(description, type) {
  return Boolean(
    description?.type === type &&
    typeof description.sdp === 'string' &&
    description.sdp.startsWith('v=0') &&
    description.sdp.length <= 65536,
  );
}
