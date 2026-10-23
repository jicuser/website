// Percent coordinates are the storage contract for every client, including Flutter.
export const SOURCE_TYPES = [
  ['poster', 'Posters'],
  ['youtube', 'YouTube'],
  ['video', 'Saved video'],
  ['camera', 'CCTV stream'],
  ['input', 'Phone camera / shared screen'],
  ['schedule', 'Use website’s saved live video'],
  ['times', 'Salah timetable'],
  ['next', 'Next prayer'],
  ['clock', 'Current clock'],
  ['brand', 'Logo'],
  ['state', 'Preset content'],
  ['text', 'Text / notice'],
  ['ramadan', 'Meal sponsorships'],
];
export const INPUT_SLOTS = ['input-1', 'input-2', 'input-3', 'input-4'];
export const MAX_SCENES = 6;
export const MAX_LAYERS = 12;
export const hasSceneContent = (scene) =>
  Boolean(scene?.layers?.some((layer) => layer.type !== 'empty'));
export function nameProblem(name, label = 'name') {
  if (typeof name !== 'string' || !name.trim()) return `Enter a ${label}.`;
  if (name.trim().length > 60) return 'Use up to 60 characters.';
  if (/^(?:(?:new|default|untitled)\s+)?(?:device|stream|scene|input|camera|screen|display)(?:[\s_-]*(?:#?\d+|one|two|three|four|five|six))?$/i.test(name.trim()))
    return `Use a descriptive ${label}, such as “Main lesson” or “Haider’s iPhone”.`;
  return '';
}
export function validateDeviceName(name, allowLegacy = false) {
  if (typeof name !== 'string' || !name.trim() || name.length > 60)
    throw new Error('Give the device a name using up to 60 characters.');
  const problem = nameProblem(name, 'device name');
  if (problem && !allowLegacy) throw new Error(problem);
  return name.trim();
}
export const newScene = (id = 'scene-1', name = 'Scene 1') => ({
  id,
  name,
  overlap: true,
  layers: [],
});
export function overlaps(a, b) {
  return (
    a.x < b.x + b.width - 0.01 &&
    a.x + a.width > b.x + 0.01 &&
    a.y < b.y + b.height - 0.01 &&
    a.y + a.height > b.y + 0.01
  );
}
export function fitRect(rect) {
  const width = Math.min(100, Math.max(5, rect.width));
  const height = Math.min(100, Math.max(5, rect.height));
  return {
    x: Math.min(100 - width, Math.max(0, rect.x)),
    y: Math.min(100 - height, Math.max(0, rect.y)),
    width,
    height,
  };
}
export function canPlace(scene, layer) {
  return (
    scene.overlap || !scene.layers.some((other) => other.id !== layer.id && overlaps(layer, other))
  );
}
export function layerStyle(layer) {
  return {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
  };
}
// Shared by the editor preview and the TV so saved crops use the same coordinates.
export function layerImageStyle(layer = {}) {
  const position = (value) =>
    Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
  return {
    objectFit: layer.image_fit === 'cover' ? 'cover' : 'contain',
    objectPosition: `${position(layer.image_position?.x)}% ${position(layer.image_position?.y)}%`,
  };
}
const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
export function validateScenes(scenes, streamUrl, youtubeUrl) {
  if (!Array.isArray(scenes) || scenes.length < 1 || scenes.length > MAX_SCENES)
    throw new Error('Keep one to six scenes.');
  if (new Set(scenes.map((s) => s?.id)).size !== scenes.length)
    throw new Error('Scene IDs must be unique.');
  return scenes.map((scene) => {
    if (
      !validId(scene?.id) ||
      typeof scene.name !== 'string' ||
      !scene.name.trim() ||
      scene.name.length > 60 ||
      typeof scene.overlap !== 'boolean'
    )
      throw new Error('Give each scene a name.');
    if (
      !Array.isArray(scene.layers) ||
      scene.layers.length > MAX_LAYERS ||
      new Set(scene.layers.map((l) => l?.id)).size !== scene.layers.length
    )
      throw new Error('Keep up to twelve sources per scene.');
    const result = {
      id: scene.id,
      name: scene.name.trim(),
      overlap: scene.overlap,
      layers: scene.layers.map((layer) => {
        if (!validId(layer?.id) || !(SOURCE_TYPES.some(([id]) => id === layer.type) || ['poster-next', 'empty'].includes(layer.type)))
          throw new Error('Unknown scene source.');
        for (const key of ['x', 'y', 'width', 'height'])
          if (!Number.isFinite(layer[key])) throw new Error('Enter valid source positions.');
        const rect = fitRect(layer);
        if (Object.keys(rect).some((key) => Math.abs(rect[key] - layer[key]) > 0.001))
          throw new Error('Sources must fit inside the screen.');
        const item = { id: layer.id, type: layer.type, ...rect };
        if (typeof layer.hidden === 'boolean') item.hidden = layer.hidden;
        if (['poster', 'poster-next'].includes(layer.type)) {
          if (layer.poster_offset !== undefined) {
            if (!Number.isInteger(layer.poster_offset) || layer.poster_offset < 0 || layer.poster_offset > 9)
              throw new Error('Use a valid poster position.');
            item.poster_offset = layer.poster_offset;
          }
          if (layer.poster_ids !== undefined) {
            if (!Array.isArray(layer.poster_ids) || layer.poster_ids.length > 100 || layer.poster_ids.some((id) => !validId(id)))
              throw new Error('Choose valid posters.');
            item.poster_ids = [...new Set(layer.poster_ids)];
          }
          if (layer.rotation_seconds !== undefined) {
            if (!Number.isInteger(layer.rotation_seconds) || layer.rotation_seconds < 5 || layer.rotation_seconds > 300)
              throw new Error('Use 5–300 seconds between posters.');
            item.rotation_seconds = layer.rotation_seconds;
          }
        }
        if (layer.type === 'youtube') item.url = youtubeUrl(layer.url);
        if (layer.type === 'video') item.url = streamUrl(layer.url);
        if (layer.type === 'camera') {
          item.url = streamUrl(layer.url);
          if (!['hls', 'whep'].includes(layer.protocol))
            throw new Error('Choose HLS or WebRTC for the camera.');
          item.protocol = layer.protocol;
        }
        if (layer.type === 'input') {
          if (!INPUT_SLOTS.includes(layer.slot)) throw new Error('Choose a device input.');
          item.slot = layer.slot;
          // Older saved scenes have no name; keep them usable until staff name them.
          if (layer.name !== undefined) item.name = validateDeviceName(layer.name, true);
          if (layer.capture !== undefined) {
            if (!['camera', 'screen'].includes(layer.capture)) throw new Error('Choose camera or screen sharing.');
            item.capture = layer.capture;
          }
        }
        if (layer.type === 'text') {
          if (typeof layer.text !== 'string' || layer.text.length > 1200)
            throw new Error('Use up to 1200 characters per notice.');
          item.text = layer.text;
        }
        if (layer.type === 'ramadan') {
          if (!['iftar', 'suhoor', 'daily'].includes(layer.ramadan_kind))
            throw new Error('Choose Iftar, Suhoor or Daily Giving.');
          item.ramadan_kind = layer.ramadan_kind;
        }
        if (layer.type === 'state') {
          if (layer.image_url !== undefined && layer.image_url !== '') {
            item.image_url = streamUrl(layer.image_url);
          }
        }
        if (['state', 'poster', 'poster-next'].includes(layer.type)) {
          if (layer.image_fit !== undefined) {
            if (!['contain', 'cover'].includes(layer.image_fit))
              throw new Error('Choose fit or crop for pictures.');
            item.image_fit = layer.image_fit;
          }
          if (layer.image_position !== undefined) {
            const position = layer.image_position;
            if (
              !position ||
              typeof position !== 'object' ||
              Array.isArray(position) ||
              ['x', 'y'].some((axis) =>
                !Number.isFinite(position[axis]) || position[axis] < 0 || position[axis] > 100,
              )
            )
              throw new Error('Keep the picture crop position between 0 and 100.');
            item.image_position = { x: position.x, y: position.y };
          }
        }
        if (['youtube', 'video', 'camera', 'input', 'schedule'].includes(layer.type)) {
          if (typeof layer.audio !== 'boolean')
            throw new Error('Choose whether this source plays audio.');
          item.audio = layer.audio;
        }
        return item;
      }),
    };
    if (!result.overlap && result.layers.some((layer) => !canPlace(result, layer)))
      throw new Error('Sources overlap. Move them apart or allow overlap.');
    const slots = result.layers.filter((l) => l.type === 'input').map((l) => l.slot);
    if (new Set(slots).size !== slots.length)
      throw new Error('Use each device input once per scene.');
    return result;
  });
}
export function usedInputSlots(settings) {
  return new Set(
    (settings.scenes || []).flatMap((s) =>
      s.layers.filter((l) => l.type === 'input').map((l) => l.slot),
    ),
  );
}
