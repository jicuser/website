import { hasPermission } from './access.js';
import { newScene, validateScenes, hasSceneContent } from './tv-scenes.js';
export const DEFAULT_STANDBY_SCENE = {
  id: 'standby',
  name: 'Standby',
  overlap: true,
  layers: [
    { id: 'standby-times', type: 'times', x: 0, y: 0, width: 100, height: 22, layout: 'horizontal' },
    { id: 'standby-poster-1', type: 'poster', x: 0, y: 22, width: 25, height: 68, poster_offset: 0 },
    { id: 'standby-poster-2', type: 'poster', x: 25, y: 22, width: 25, height: 68, poster_offset: 1 },
    { id: 'standby-poster-3', type: 'poster', x: 50, y: 22, width: 25, height: 68, poster_offset: 2 },
    { id: 'standby-poster-4', type: 'poster', x: 75, y: 22, width: 25, height: 68, poster_offset: 3 },
    { id: 'standby-brand', type: 'brand', x: 0, y: 90, width: 13, height: 10 },
    { id: 'standby-next', type: 'next', x: 13, y: 90, width: 42, height: 10 },
    { id: 'standby-clock', type: 'clock', x: 55, y: 90, width: 45, height: 10 },
  ],
};
export const TV_PRESET_KEYS = ['standby', 'before', 'jamaah', 'dhikr', 'jummah', 'ramadan'];
export const DEFAULT_TV_PRESET_NAMES = {
  standby: 'Standby',
  before: 'Before Jama‘ah',
  jamaah: 'Jama‘ah',
  dhikr: 'Dhikr',
  jummah: 'Jummah',
  ramadan: 'Ramadan du‘a',
};
export const DEFAULT_TV_PRESET_SCENES = {
  before: {
    id: 'preset-before',
    name: 'Before Jama‘ah',
    overlap: true,
    layers: [
      { id: 'before-times', type: 'times', x: 0, y: 0, width: 100, height: 22, layout: 'horizontal' },
      { id: 'before-state', type: 'state', x: 0, y: 22, width: 100, height: 68 },
      { id: 'before-brand', type: 'brand', x: 0, y: 90, width: 13, height: 10 },
      { id: 'before-next', type: 'next', x: 13, y: 90, width: 42, height: 10 },
      { id: 'before-clock', type: 'clock', x: 55, y: 90, width: 45, height: 10 },
    ],
  },
  jamaah: {
    id: 'preset-jamaah',
    name: 'Jama‘ah',
    overlap: true,
    layers: [
      { id: 'jamaah-times', type: 'times', x: 0, y: 0, width: 100, height: 22, layout: 'horizontal' },
      { id: 'jamaah-state', type: 'state', x: 0, y: 22, width: 100, height: 68 },
      { id: 'jamaah-brand', type: 'brand', x: 0, y: 90, width: 13, height: 10 },
      { id: 'jamaah-next', type: 'next', x: 13, y: 90, width: 42, height: 10 },
      { id: 'jamaah-clock', type: 'clock', x: 55, y: 90, width: 45, height: 10 },
    ],
  },
  dhikr: {
    id: 'preset-dhikr',
    name: 'Dhikr',
    overlap: true,
    layers: [
      { id: 'dhikr-state', type: 'state', x: 0, y: 0, width: 100, height: 91 },
      { id: 'dhikr-brand', type: 'brand', x: 0, y: 91, width: 16, height: 9 },
      { id: 'dhikr-clock', type: 'clock', x: 58, y: 91, width: 42, height: 9, hidden: true },
    ],
  },
  jummah: {
    id: 'preset-jummah',
    name: 'Jummah',
    overlap: true,
    layers: [
      { id: 'jummah-times', type: 'times', x: 0, y: 0, width: 100, height: 22, layout: 'horizontal' },
      { id: 'jummah-state', type: 'state', x: 0, y: 22, width: 100, height: 68 },
      { id: 'jummah-brand', type: 'brand', x: 0, y: 90, width: 13, height: 10 },
      { id: 'jummah-clock', type: 'clock', x: 55, y: 90, width: 45, height: 10 },
    ],
  },
  ramadan: {
    id: 'preset-ramadan',
    name: 'Ramadan du‘a',
    overlap: true,
    layers: [
      { id: 'ramadan-state', type: 'state', x: 0, y: 0, width: 100, height: 90 },
      { id: 'ramadan-brand', type: 'brand', x: 0, y: 90, width: 13, height: 10 },
      { id: 'ramadan-clock', type: 'clock', x: 55, y: 90, width: 45, height: 10 },
    ],
  },
};


export const PRAYER_TIMETABLE_LAYOUTS = ['horizontal', 'compact', 'clock-table', 'vertical'];

export const DEFAULT_PORTRAIT_STANDBY_SCENE = {
  id: 'standby-portrait',
  name: 'Standby portrait',
  overlap: true,
  layers: [
    { id: 'portrait-times', type: 'times', x: 0, y: 0, width: 100, height: 34, layout: 'vertical' },
    { id: 'portrait-next', type: 'next', x: 0, y: 34, width: 100, height: 8 },
    { id: 'portrait-poster-1', type: 'poster', x: 0, y: 42, width: 50, height: 40, poster_offset: 0 },
    { id: 'portrait-poster-2', type: 'poster', x: 50, y: 42, width: 50, height: 40, poster_offset: 1 },
    { id: 'portrait-poster-3', type: 'poster', x: 0, y: 42, width: 50, height: 40, poster_offset: 2, hidden: true },
    { id: 'portrait-poster-4', type: 'poster', x: 50, y: 42, width: 50, height: 40, poster_offset: 3, hidden: true },
    { id: 'portrait-brand', type: 'brand', x: 0, y: 82, width: 24, height: 18 },
    { id: 'portrait-clock', type: 'clock', x: 24, y: 82, width: 76, height: 18 },
  ],
};

const portraitPresetScene = (key, name, options = {}) => ({
  id: `preset-${key}-portrait`,
  name: `${name} portrait`,
  overlap: true,
  layers:
    key === 'dhikr' || key === 'ramadan'
      ? [
          { id: `${key}-portrait-state`, type: 'state', x: 0, y: 0, width: 100, height: 90 },
          { id: `${key}-portrait-brand`, type: 'brand', x: 0, y: 90, width: 26, height: 10 },
          { id: `${key}-portrait-clock`, type: 'clock', x: 26, y: 90, width: 74, height: 10, hidden: key === 'dhikr' },
        ]
      : [
          { id: `${key}-portrait-state`, type: 'state', x: 0, y: 0, width: 100, height: 58 },
          { id: `${key}-portrait-times`, type: 'times', x: 0, y: 58, width: 100, height: 30, layout: options.layout || 'vertical' },
          { id: `${key}-portrait-next`, type: 'next', x: 0, y: 88, width: 100, height: 6, hidden: key === 'jummah' },
          { id: `${key}-portrait-clock`, type: 'clock', x: 0, y: 94, width: 100, height: 6 },
        ],
});

export const DEFAULT_TV_PORTRAIT_PRESET_SCENES = {
  before: portraitPresetScene('before', 'Before Jama‘ah'),
  jamaah: portraitPresetScene('jamaah', 'Jama‘ah'),
  dhikr: portraitPresetScene('dhikr', 'Dhikr'),
  jummah: portraitPresetScene('jummah', 'Jummah'),
  ramadan: portraitPresetScene('ramadan', 'Ramadan du‘a'),
};

const cloneScene = (scene) => ({
  ...scene,
  layers: (scene?.layers || []).map((layer) => ({ ...layer })),
});

const defaultOrientationLayouts = () => ({
  landscape: {
    standby: cloneScene(DEFAULT_STANDBY_SCENE),
    ...Object.fromEntries(
      Object.entries(DEFAULT_TV_PRESET_SCENES).map(([key, scene]) => [key, cloneScene(scene)]),
    ),
  },
  portrait: {
    standby: cloneScene(DEFAULT_PORTRAIT_STANDBY_SCENE),
    ...Object.fromEntries(
      Object.entries(DEFAULT_TV_PORTRAIT_PRESET_SCENES).map(([key, scene]) => [key, cloneScene(scene)]),
    ),
  },
});

export const DEFAULT_TV_DISPLAY_LAYOUTS = defaultOrientationLayouts();

export function tvDisplayScene(settings = {}, preset = 'standby', orientation = settings.display_orientation || 'landscape') {
  const direct = settings.display_layouts?.[orientation]?.[preset];
  if (direct) return direct;
  if (orientation === 'landscape') {
    if (preset === 'standby' && settings.standby_scene) return settings.standby_scene;
    if (preset !== 'standby' && settings.preset_scenes?.[preset]) return settings.preset_scenes[preset];
  }
  return defaultOrientationLayouts()[orientation]?.[preset] || cloneScene(DEFAULT_STANDBY_SCENE);
}

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
  'community-announcements',
  'after-maghrib',
  'adhan-iqamah-course',
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
  display_orientation: 'landscape',
  standby_scene: DEFAULT_STANDBY_SCENE,
  preset_names: DEFAULT_TV_PRESET_NAMES,
  preset_scenes: DEFAULT_TV_PRESET_SCENES,
  display_layouts: DEFAULT_TV_DISPLAY_LAYOUTS,
  scheduled_scenes: [],
  jamaah_lead_minutes: 1,
  before_jamaah_message: 'Jama‘ah begins in 1 minute',
  jamaah_message: 'It is Jama‘ah time',
  jamaah_submessage: 'Please switch off or silence your phone.',
  dhikr_delay_fajr: 14,
  dhikr_delay_dhuhr: 9,
  dhikr_delay_asr: 9,
  dhikr_delay_maghrib: 8,
  dhikr_delay_isha: 7,
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
  const defaults = defaultOrientationLayouts();
  const legacyLandscape = {
    standby: settings.standby_scene || defaults.landscape.standby,
    ...Object.fromEntries(
      TV_PRESET_KEYS.filter((key) => key !== 'standby').map((key) => [
        key,
        settings.preset_scenes?.[key] || defaults.landscape[key],
      ]),
    ),
  };
  const displayLayouts = {
    landscape: Object.fromEntries(
      TV_PRESET_KEYS.map((key) => [
        key,
        cloneScene(settings.display_layouts?.landscape?.[key] || legacyLandscape[key] || defaults.landscape[key]),
      ]),
    ),
    portrait: Object.fromEntries(
      TV_PRESET_KEYS.map((key) => [
        key,
        cloneScene(settings.display_layouts?.portrait?.[key] || defaults.portrait[key]),
      ]),
    ),
  };
  const orientation = ['landscape', 'portrait'].includes(settings.display_orientation)
    ? settings.display_orientation
    : 'landscape';
  const next = {
    ...DEFAULT_TV_SETTINGS,
    ...settings,
    display_orientation: orientation,
    display_layouts: displayLayouts,
    standby_scene: displayLayouts[orientation].standby,
    preset_names: { ...DEFAULT_TV_PRESET_NAMES, ...(settings.preset_names || {}) },
    preset_scenes: Object.fromEntries(
      TV_PRESET_KEYS.filter((key) => key !== 'standby').map((key) => [
        key,
        displayLayouts[orientation][key],
      ]),
    ),
    scheduled_scenes: Array.isArray(settings.scheduled_scenes)
      ? settings.scheduled_scenes.map((item) => ({
          ...item,
          days: Array.isArray(item?.days) ? [...item.days] : [],
          layouts: {
            landscape: item?.layouts?.landscape ? cloneScene(item.layouts.landscape) : null,
            portrait: item?.layouts?.portrait ? cloneScene(item.layouts.portrait) : null,
          },
        }))
      : [],
  };
  // Remove only the exact old generated starter layout. Custom scenes are preserved.
  const starter = [
    ['poster', 'poster', 0, 18, 50, 75],
    ['poster2', 'poster-next', 50, 18, 50, 75],
    ['times', 'times', 0, 0, 100, 18],
    ['clock', 'clock', 76, 93, 24, 7],
  ];
  if (Array.isArray(next.scenes))
    next.scenes = next.scenes.map((scene) => {
      const oldStarter =
        scene.layers?.length === 4 &&
        starter.every(([suffix, type, x, y, width, height], i) => {
          const expected = { id: `${scene.id}-${suffix}`, type, x, y, width, height };
          const layer = scene.layers[i];
          return (
            Object.keys(layer).length === Object.keys(expected).length &&
            Object.entries(expected).every(([key, val]) => layer[key] === val)
          );
        });
      return oldStarter ? { ...scene, layers: [] } : scene;
    });
  return next;
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
  if (!['landscape', 'portrait'].includes(values.display_orientation))
    throw new Error('Choose landscape or portrait.');
  result.display_orientation = values.display_orientation;
  if (!Number.isInteger(values.jamaah_lead_minutes) || values.jamaah_lead_minutes < 0 || values.jamaah_lead_minutes > 10)
    throw new Error('Use 0–10 minutes for the pre-Jama‘ah screen.');
  result.jamaah_lead_minutes = values.jamaah_lead_minutes;
  for (const key of ['before_jamaah_message', 'jamaah_message', 'jamaah_submessage']) {
    if (typeof values[key] !== 'string' || values[key].length > 240)
      throw new Error('Use up to 240 characters for prayer screen messages.');
    result[key] = values[key].trim();
  }
  if (!values.preset_names || typeof values.preset_names !== 'object')
    throw new Error('Preset names are required.');
  result.preset_names = {};
  for (const key of TV_PRESET_KEYS) {
    const name = values.preset_names[key];
    if (typeof name !== 'string' || !name.trim() || name.length > 40)
      throw new Error('Use 1–40 characters for each TV preset name.');
    result.preset_names[key] = name.trim();
  }
  const allowedStandby = new Set(['times', 'next', 'clock', 'poster', 'poster-next', 'text', 'brand', 'empty']);
  const allowedPreset = new Set(['times', 'next', 'clock', 'state', 'text', 'brand', 'empty']);
  const validateDisplayScene = (source, preset) => {
    const checked = validateScenes([source], secureStreamUrl, youtubeUrl)[0];
    const allowed = preset === 'standby' ? allowedStandby : allowedPreset;
    if (checked.layers.some((layer) => !allowed.has(layer.type)))
      throw new Error(
        preset === 'standby'
          ? 'Standby layouts can use timetable, next prayer, clock, posters, logo and text only.'
          : 'Prayer preset layouts can use timetable, preset content, next prayer, clock, logo and text only.',
      );
    if (
      preset !== 'standby' &&
      !checked.layers.some((layer) => layer.type === 'state' && !layer.hidden)
    )
      throw new Error('Each prayer preset needs a visible preset content block.');
    for (const layer of checked.layers) {
      if (layer.type !== 'times') continue;
      const original = source.layers.find((item) => item.id === layer.id);
      const layout = original?.layout || 'horizontal';
      if (!PRAYER_TIMETABLE_LAYOUTS.includes(layout))
        throw new Error('Choose a valid prayer timetable layout.');
      layer.layout = layout;
    }
    return checked;
  };
  result.display_layouts = {};
  for (const orientation of ['landscape', 'portrait']) {
    result.display_layouts[orientation] = {};
    for (const preset of TV_PRESET_KEYS) {
      result.display_layouts[orientation][preset] = validateDisplayScene(
        values.display_layouts[orientation][preset],
        preset,
      );
    }
  }
  result.standby_scene = result.display_layouts[result.display_orientation].standby;
  result.preset_scenes = Object.fromEntries(
    TV_PRESET_KEYS.filter((key) => key !== 'standby').map((key) => [
      key,
      result.display_layouts[result.display_orientation][key],
    ]),
  );

  if (!Array.isArray(values.scheduled_scenes) || values.scheduled_scenes.length > 12)
    throw new Error('Keep up to twelve scheduled TV scenes.');
  const scheduledIds = new Set();
  const scheduledAllowed = new Set(['times', 'next', 'clock', 'poster', 'poster-next', 'text', 'brand', 'empty']);
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  result.scheduled_scenes = values.scheduled_scenes.map((item) => {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id) ||
      scheduledIds.has(item.id)
    )
      throw new Error('Scheduled TV scene IDs must be unique.');
    scheduledIds.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60)
      throw new Error('Give every scheduled TV scene a short name.');
    if (typeof item.enabled !== 'boolean' || typeof item.all_day !== 'boolean')
      throw new Error('Choose whether each scheduled TV scene is active.');
    if (
      !Array.isArray(item.days) ||
      !item.days.length ||
      item.days.length > 7 ||
      new Set(item.days).size !== item.days.length ||
      item.days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)
    )
      throw new Error('Choose at least one valid day for every scheduled TV scene.');
    if (!item.all_day && (!clockPattern.test(item.start_time || '') || !clockPattern.test(item.end_time || '')))
      throw new Error('Choose valid start and end times for scheduled TV scenes.');
    if (!item.layouts || typeof item.layouts !== 'object')
      throw new Error('Scheduled TV scenes need landscape and portrait layouts.');
    const layouts = {};
    for (const orientation of ['landscape', 'portrait']) {
      const source = item.layouts[orientation];
      const checked = validateScenes([source], secureStreamUrl, youtubeUrl)[0];
      if (checked.layers.some((layer) => !scheduledAllowed.has(layer.type)))
        throw new Error('Scheduled scenes can use posters, timetable, next prayer, clock, logo and text only.');
      for (const layer of checked.layers) {
        if (layer.type !== 'times') continue;
        const original = source.layers.find((candidate) => candidate.id === layer.id);
        const layout = original?.layout || 'horizontal';
        if (!PRAYER_TIMETABLE_LAYOUTS.includes(layout))
          throw new Error('Choose a valid prayer timetable layout.');
        layer.layout = layout;
      }
      layouts[orientation] = checked;
    }
    return {
      id: item.id,
      name: item.name.trim(),
      enabled: item.enabled,
      days: [...item.days].sort((a, b) => a - b),
      all_day: item.all_day,
      start_time: item.all_day ? '' : item.start_time,
      end_time: item.all_day ? '' : item.end_time,
      layouts,
    };
  });
  for (const key of [
    'dhikr_delay_fajr',
    'dhikr_delay_dhuhr',
    'dhikr_delay_asr',
    'dhikr_delay_maghrib',
    'dhikr_delay_isha',
  ]) {
    if (!Number.isInteger(values[key]) || values[key] < 0 || values[key] > 20)
      throw new Error('Use 0–20 minutes for each post-salah dhikr delay.');
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
  if (
    !Array.isArray(values.poster_ids) ||
    values.poster_ids.length > 100 ||
    values.poster_ids.some((id) => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id))
  )
    throw new Error('Unknown poster.');
  result.poster_ids = [...new Set(values.poster_ids)];
  if (
    !Number.isInteger(values.rotation_seconds) ||
    values.rotation_seconds < 5 ||
    values.rotation_seconds > 300
  )
    throw new Error('Use 5–300 seconds between posters.');
  result.rotation_seconds = values.rotation_seconds;
  result.scenes = validateScenes(values.scenes, secureStreamUrl, youtubeUrl);
  const captures = new Map();
  for (const scene of result.scenes) {
    for (const layer of scene.layers) {
      if (layer.type !== 'input' || !layer.capture) continue;
      if (captures.has(layer.slot) && captures.get(layer.slot) !== layer.capture)
        throw new Error(
          `${layer.slot.replace('input-', 'Input ')} must use the same source in every scene. Choose Camera or Screen share in its options.`,
        );
      captures.set(layer.slot, layer.capture);
    }
  }
  if (!result.scenes.some((s) => s.id === values.active_scene_id))
    throw new Error('Choose a saved scene.');
  result.active_scene_id = values.active_scene_id;
  // Clearing the selected scene returns the display to Normal without discarding other layouts.
  result.scene_mode = tvScene(result);
  if (result.scene_mode === 'normal') result.class_until = '';
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
  if (!paired)
    return {
      ...settings,
      scene_mode: 'normal',
      scenes: [newScene()],
      active_scene_id: 'scene-1',
      scheduled_scenes: [],
    };
  return { ...settings, scene_mode: tvScene(settings) };
}
export function activeTvScene(settings = {}) {
  return settings.scenes?.find((scene) => scene.id === settings.active_scene_id) || null;
}
export function tvScene(settings = {}, now = Date.now()) {
  return settings.scene_mode === 'teaching' &&
    hasSceneContent(activeTvScene(settings)) &&
    (!settings.class_until || Date.parse(settings.class_until) > now)
    ? 'teaching'
    : 'normal';
}
export function tvScheduledScene(settings = {}, now = new Date(), orientation = settings.display_orientation || 'landscape') {
  const scenes = Array.isArray(settings.scheduled_scenes) ? settings.scheduled_scenes : [];
  if (!scenes.length) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const day = dayMap[parts.weekday];
  const previousDay = day === 1 ? 7 : day - 1;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const toMinutes = (value) => {
    const [hour, minutes] = String(value || '').split(':').map(Number);
    return hour * 60 + minutes;
  };
  for (const item of scenes) {
    if (!item?.enabled) continue;
    let active = false;
    if (item.all_day) active = item.days?.includes(day);
    else {
      const start = toMinutes(item.start_time);
      const end = toMinutes(item.end_time);
      if (start === end) active = item.days?.includes(day);
      else if (start < end) active = item.days?.includes(day) && minute >= start && minute < end;
      else
        active =
          (item.days?.includes(day) && minute >= start) ||
          (item.days?.includes(previousDay) && minute < end);
    }
    if (active) {
      const layout = item.layouts?.[orientation] || item.layouts?.landscape || item.layouts?.portrait;
      if (layout) return { id: item.id, name: item.name, scene: layout };
    }
  }
  return null;
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
