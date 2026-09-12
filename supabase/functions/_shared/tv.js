// Shared by the TV interface and its API so screen names and validation stay in one place.
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
  mode: 'posters',
  scene_mode: 'normal',
  event_title: '',
  event_message: '',
  youtube_url: '',
  camera_url: '',
  camera_protocol: 'hls',
  poster_ids: POSTER_IDS,
  include_events: true,
  rotation_seconds: 20,
  muted: true,
  prayer_enabled: true,
  class_until: '',
  notice_mode: 'off',
  jummah_notice:
    'Welcome to Jumu‘ah. Please silence your phone, make room for others and listen quietly during the khutbah.',
  taraweeh_dua: '',
};
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
export function validateSettings(input, screenId = '') {
  if (!input || typeof input !== 'object') throw new Error('Screen settings are required.');
  input = { ...DEFAULT_TV_SETTINGS, ...input };
  if (screenId === 'shoe-area')
    input = {
      ...input,
      mode: 'posters',
      camera_url: '',
      youtube_url: '',
      prayer_enabled: false,
      class_until: '',
      notice_mode: 'off',
      scene_mode: 'normal',
      event_title: '',
      event_message: '',
    };
  if (!['normal', 'class', 'speech', 'ramadan'].includes(input.scene_mode))
    throw new Error('Choose Normal, Class, Speech or Ramadan.');
  for (const [field, limit] of [
    ['event_title', 120],
    ['event_message', 500],
  ]) {
    if (typeof input[field] !== 'string' || input[field].length > limit)
      throw new Error(`Event text must be at most ${limit} characters.`);
  }
  if (!['off', 'jummah', 'taraweeh'].includes(input.notice_mode))
    throw new Error('Choose a notice display.');
  for (const field of ['jummah_notice', 'taraweeh_dua']) {
    if (typeof input[field] !== 'string' || input[field].length > 1200)
      throw new Error('Notice text must be at most 1200 characters.');
  }
  if (typeof input.class_until !== 'string') throw new Error('Invalid class end time.');
  if (typeof input.prayer_enabled !== 'boolean') throw new Error('Invalid prayer display setting.');
  if (
    input.class_until &&
    (!Number.isFinite(Date.parse(input.class_until)) ||
      Date.parse(input.class_until) > Date.now() + 8 * 3600000)
  )
    throw new Error('Class mode must end within eight hours.');
  const { mode, camera_protocol, poster_ids, rotation_seconds, include_events, muted } = input;
  if (!['schedule', 'posters', 'youtube', 'camera'].includes(mode))
    throw new Error('Choose a display mode.');
  if (!['hls', 'whep'].includes(camera_protocol)) throw new Error('Choose a camera protocol.');
  if (!Array.isArray(poster_ids) || poster_ids.some((id) => !POSTER_IDS.includes(id)))
    throw new Error('Unknown poster selection.');
  if (!Number.isInteger(rotation_seconds) || rotation_seconds < 5 || rotation_seconds > 300)
    throw new Error('Poster rotation must be 5–300 seconds.');
  if (typeof include_events !== 'boolean' || typeof muted !== 'boolean')
    throw new Error('Invalid screen options.');
  const youtube_url = input.youtube_url ? secureStreamUrl(input.youtube_url) : '';
  const camera_url = input.camera_url ? secureStreamUrl(input.camera_url) : '';
  if (youtube_url) {
    const url = new URL(youtube_url);
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
  }
  if (mode === 'youtube' && !youtube_url) throw new Error('Add a YouTube link.');
  if (mode === 'camera' && !camera_url) throw new Error('Add a camera stream URL.');
  if (!poster_ids.length && !include_events)
    throw new Error('Keep at least one poster or upcoming events for the fallback display.');
  return {
    mode,
    scene_mode: input.scene_mode,
    event_title: input.event_title.trim(),
    event_message: input.event_message.trim(),
    youtube_url,
    camera_url,
    camera_protocol,
    notice_mode: input.notice_mode,
    jummah_notice: input.jummah_notice.trim(),
    taraweeh_dua: input.taraweeh_dua.trim(),
    prayer_enabled: input.prayer_enabled,
    class_until: input.class_until ? new Date(input.class_until).toISOString() : '',
    poster_ids: [...new Set(poster_ids)],
    include_events,
    rotation_seconds,
    muted,
  };
}
export function publicSettings(settings, paired = false) {
  // Never include private camera URLs in an unauthenticated response.
  const {
    mode,
    youtube_url,
    camera_protocol,
    poster_ids,
    include_events,
    rotation_seconds,
    muted,
  } = settings;
  return {
    mode: mode === 'camera' && !paired ? 'posters' : mode,
    scene_mode: settings.scene_mode || 'normal',
    event_title: settings.event_title || '',
    event_message: settings.event_message || '',
    youtube_url,
    camera_protocol,
    poster_ids,
    include_events,
    rotation_seconds,
    muted,
    notice_mode: settings.notice_mode || 'off',
    jummah_notice: settings.jummah_notice ?? DEFAULT_TV_SETTINGS.jummah_notice,
    taraweeh_dua: settings.taraweeh_dua || '',
    prayer_enabled: settings.prayer_enabled !== false,
    class_until: settings.class_until || '',
    ...(paired ? { camera_url: settings.camera_url } : {}),
  };
}
export function activeSession(screen, now = Date.now()) {
  return Boolean(screen.share_session && new Date(screen.share_expires).getTime() > now);
}

// Timed classes/speeches return to normal without depending on a browser timer firing.
export function tvScene(settings = {}, now = Date.now()) {
  const scene =
    settings.scene_mode || (Date.parse(settings.class_until) > now ? 'class' : 'normal');
  if (['class', 'speech'].includes(scene) && !(Date.parse(settings.class_until) > now))
    return 'normal';
  return ['normal', 'class', 'speech', 'ramadan'].includes(scene) ? scene : 'normal';
}
export function validDescription(description, type) {
  return Boolean(
    description?.type === type &&
    typeof description.sdp === 'string' &&
    description.sdp.startsWith('v=0') &&
    description.sdp.length <= 65536,
  );
}

export function isTvStaff(profile) {
  return Boolean(
    profile?.is_active &&
    ['super_admin', 'admin', 'content_editor', 'tv_operator'].includes(profile.role),
  );
}
