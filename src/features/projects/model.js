import { posterImage } from '../../lib/posters.js';
export const PROJECT_KEY = 'masjid_project_stages';
export const STAGE_STATUS = [
  ['update_pending', 'Details not published'],
  ['planned', 'Planned'],
  ['in_progress', 'In progress'],
  ['completed', 'Completed'],
];
export const DEFAULT_STAGES = [
  ['main-prayer-hall', 'Main prayer hall', 'A welcoming space for congregational prayer.'],
  ['wudu-area', 'Wudu & facilities', 'Facilities that support every visit.'],
  ['community-hall', 'Community hall', 'Space for gatherings and community life.'],
  ['madrassah-floor', 'Madrassah floor', 'A place for learning and the next generation.'],
].map(([id, title, description]) => ({
  id,
  title,
  description,
  status: 'update_pending',
  started_on: '',
  completed_on: '',
  photos: [],
  polycam: '',
  visible: true,
}));
export function polycamEmbed(value) {
  if (!value?.trim()) return '';
  const src = value.trim().startsWith('<iframe')
    ? value.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
    : value.trim();
  try {
    const url = new URL(src);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'poly.cam' ||
      url.username ||
      url.password ||
      url.port ||
      !/^\/capture\/[a-zA-Z0-9_-]{1,100}(\/embed)?\/?$/.test(url.pathname)
    )
      return '';
    return `https://poly.cam${url.pathname.replace(/\/$/, '').replace(/\/embed$/, '')}/embed`;
  } catch {
    return '';
  }
}
export function validateStages(stages) {
  if (!Array.isArray(stages) || stages.length > 30)
    throw new Error('Keep the project to 30 stages or fewer.');
  const ids = new Set();
  return stages.map((s) => {
    if (!/^[a-z0-9-]{1,64}$/.test(s.id) || ids.has(s.id))
      throw new Error('Each stage needs a unique reference.');
    ids.add(s.id);
    if (
      !s.title?.trim() ||
      s.title.length > 100 ||
      typeof s.description !== 'string' ||
      s.description.length > 4000
    )
      throw new Error('Add a stage title and keep the description under 4,000 characters.');
    if (!STAGE_STATUS.some(([id]) => id === s.status)) throw new Error('Choose a stage status.');
    for (const d of [s.started_on, s.completed_on])
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Choose a valid date.');
    if (s.started_on && s.completed_on && s.completed_on < s.started_on)
      throw new Error('Completion cannot be before the start date.');
    if (
      !Array.isArray(s.photos) ||
      s.photos.length > 12 ||
      s.photos.some((p) => !posterImage(p.url) || !p.caption?.trim() || p.caption.length > 240)
    )
      throw new Error('Each stage can have up to 12 photos with short captions.');
    if (s.polycam && !polycamEmbed(s.polycam))
      throw new Error('Paste the public Polycam capture link or its embed code.');
    return {
      ...s,
      title: s.title.trim(),
      description: s.description.trim(),
      polycam: polycamEmbed(s.polycam),
      visible: s.visible !== false,
    };
  });
}
export function parseStages(raw) {
  try {
    return validateStages(JSON.parse(raw));
  } catch {
    return DEFAULT_STAGES;
  }
}
