import { tvBoardLayout } from './tv-board-layouts.js';

export const TV_EVERYDAY_SCENES = [
  { id: 'classic', name: 'Timetable & notices' },
  { id: 'iftar', name: 'Iftar sponsorships' },
  { id: 'suhoor', name: 'Suhoor sponsorships' },
  { id: 'daily-giving', name: 'Daily Giving' },
];
export const DEFAULT_TV_EVERYDAY_DISPLAY = {
  mode: 'fixed',
  fixed_scene: 'classic',
  rotation: [{ kind: 'classic', duration_seconds: 20 }],
  persistent_layer_ids: { landscape: [], portrait: [] },
};
const sceneName = (kind) => TV_EVERYDAY_SCENES.find((scene) => scene.id === kind)?.name;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function normaliseTvEverydayDisplay(value) {
  const source = object(value) ? value : {};
  return {
    mode: source.mode === undefined ? DEFAULT_TV_EVERYDAY_DISPLAY.mode : source.mode,
    fixed_scene: source.fixed_scene === undefined ? DEFAULT_TV_EVERYDAY_DISPLAY.fixed_scene : source.fixed_scene,
    rotation: Array.isArray(source.rotation)
      ? source.rotation.map((item) => ({ kind: item?.kind, duration_seconds: item?.duration_seconds }))
      : source.rotation ?? DEFAULT_TV_EVERYDAY_DISPLAY.rotation.map((item) => ({ ...item })),
    persistent_layer_ids: Object.fromEntries(['landscape', 'portrait'].map((orientation) => [
        orientation,
        Array.isArray(source.persistent_layer_ids?.[orientation])
          ? [...source.persistent_layer_ids[orientation]]
          : source.persistent_layer_ids?.[orientation] ?? [],
      ])),
  };
}

export function tvPersistentLayers(programme, scene, orientation) {
  const selected = programme?.persistent_layer_ids?.[orientation] || [];
  return (scene?.layers || []).filter((layer) =>
    selected.includes(layer.id) && !layer.hidden && layer.type !== 'empty',
  );
}

// Find the largest clear rectangle around the fixed items. Considering each pair
// of vertical edges also supports a timetable down either side, headers and footers.
export function tvChangingContentRect(layers) {
  // Match the board templates' space for the separate display-connection code.
  const fixed = [...layers, { x: 0, y: 95, width: 100, height: 5 }];
  const edges = [...new Set([0, 100, ...fixed.flatMap((layer) => [layer.x, layer.x + layer.width])])]
    .sort((a, b) => a - b);
  let best = null;
  for (let left = 0; left < edges.length - 1; left++) {
    for (let right = left + 1; right < edges.length; right++) {
      const x = edges[left];
      const width = edges[right] - x;
      if (width < 20) continue;
      const occupied = fixed
        .filter((layer) => layer.x < edges[right] - 0.01 && layer.x + layer.width > x + 0.01)
        .map((layer) => [layer.y, layer.y + layer.height])
        .sort((a, b) => a[0] - b[0]);
      let top = 0;
      for (const [start, end] of [...occupied, [100, 100]]) {
        const height = start - top;
        if (height >= 20 && (!best || width * height > best.width * best.height))
          best = { x, y: top, width, height };
        top = Math.max(top, end);
      }
    }
  }
  return best;
}

export function validateTvEverydayDisplay(value, layouts) {
  if (!object(value)) throw new Error('Choose valid everyday display settings.');
  if (value.rotation !== undefined && !Array.isArray(value.rotation))
    throw new Error('Choose one to four scenes for the rotation.');
  const programme = normaliseTvEverydayDisplay(value);
  if (!['fixed', 'rotation'].includes(programme.mode))
    throw new Error('Choose a fixed everyday display or a scene rotation.');
  if (!sceneName(programme.fixed_scene)) throw new Error('Choose a valid fixed scene.');
  if (!Array.isArray(programme.rotation) || !programme.rotation.length || programme.rotation.length > 4)
    throw new Error('Choose one to four scenes for the rotation.');
  const kinds = new Set();
  const rotation = programme.rotation.map((item) => {
    if (!object(item) || !sceneName(item.kind) || kinds.has(item.kind))
      throw new Error('Choose each rotation scene once.');
    kinds.add(item.kind);
    if (!Number.isInteger(item.duration_seconds) || item.duration_seconds < 5 || item.duration_seconds > 300)
      throw new Error('Show each scene for 5–300 seconds.');
    return { kind: item.kind, duration_seconds: item.duration_seconds };
  });
  if (value.persistent_layer_ids !== undefined && !object(value.persistent_layer_ids))
    throw new Error('Choose valid fixed items for the everyday display.');
  const persistentIds = {};
  for (const orientation of ['landscape', 'portrait']) {
    if (value.persistent_layer_ids?.[orientation] !== undefined && !Array.isArray(value.persistent_layer_ids[orientation]))
      throw new Error('Choose valid fixed items for the everyday display.');
    const ids = programme.persistent_layer_ids[orientation];
    const scene = layouts[orientation].standby;
    if (!Array.isArray(ids) || ids.length > 12 || new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== 'string' || !scene.layers.some((layer) => layer.id === id)))
      throw new Error('Choose fixed items from this screen’s timetable layout.');
    persistentIds[orientation] = [...ids];
    if (!tvChangingContentRect(tvPersistentLayers(programme, scene, orientation)))
      throw new Error('Leave room for changing scenes. Remove a fixed item or move it in the timetable layout.');
  }
  return {
    mode: programme.mode,
    fixed_scene: programme.fixed_scene,
    rotation,
    persistent_layer_ids: persistentIds,
  };
}

export function resolveTvEverydayScene(settings, standby, now, orientation) {
  const programme = normaliseTvEverydayDisplay(settings.everyday_display);
  let kind = programme.fixed_scene;
  let remaining = null;
  let index = 0;
  if (programme.mode === 'rotation' && programme.rotation.length) {
    const total = programme.rotation.reduce((sum, item) => sum + item.duration_seconds, 0);
    const seconds = (now instanceof Date ? now.getTime() : Number(now)) / 1000;
    let position = ((seconds % total) + total) % total;
    for (const [offset, item] of programme.rotation.entries()) {
      if (position < item.duration_seconds) {
        kind = item.kind;
        index = offset;
        remaining = Math.ceil(item.duration_seconds - position);
        break;
      }
      position -= item.duration_seconds;
    }
  }
  let scene = kind === 'classic' ? standby : tvBoardLayout(kind, orientation);
  const persistent = tvPersistentLayers(programme, standby, orientation);
  if (kind !== 'classic' && persistent.length) {
    const area = tvChangingContentRect(persistent);
    let contentId = 'everyday-ramadan';
    for (let suffix = 1; persistent.some((layer) => layer.id === contentId); suffix++)
      contentId = `everyday-ramadan-${suffix}`;
    // The shared validator requires clear space. Keep the saved layout as a safe
    // fallback if an older client supplies an incomplete draft while editing.
    scene = area ? {
      ...scene,
      layers: [
        { id: contentId, type: 'ramadan', ramadan_kind: kind === 'daily-giving' ? 'daily' : kind, ...area },
        ...persistent,
      ],
    } : standby;
  }
  return {
    source: programme.mode,
    kind,
    name: kind === 'classic' && standby.name && !/^Standby(?: portrait)?$/i.test(standby.name)
      ? standby.name
      : sceneName(kind),
    scene,
    rotation_index: index,
    remaining_seconds: remaining,
  };
}
