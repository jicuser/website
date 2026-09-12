// Percent coordinates are the storage contract for every client, including Flutter.
export const SOURCE_TYPES = [
  ['poster', 'Posters'],
  ['youtube', 'YouTube'],
  ['camera', 'CCTV stream'],
  ['input', 'Phone camera / shared screen'],
  ['schedule', 'Use website’s saved live video'],
  ['times', 'Salah timetable'],
  ['next', 'Next prayer'],
  ['clock', 'Current clock'],
  ['text', 'Text / notice'],
];
export const INPUT_SLOTS = ['input-1', 'input-2', 'input-3', 'input-4'];
export const MAX_SCENES = 6;
export const MAX_LAYERS = 12;
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
        if (!validId(layer?.id) || !(SOURCE_TYPES.some(([id]) => id === layer.type) || layer.type === 'poster-next'))
          throw new Error('Unknown scene source.');
        for (const key of ['x', 'y', 'width', 'height'])
          if (!Number.isFinite(layer[key])) throw new Error('Enter valid source positions.');
        const rect = fitRect(layer);
        if (Object.keys(rect).some((key) => Math.abs(rect[key] - layer[key]) > 0.001))
          throw new Error('Sources must fit inside the landscape screen.');
        const item = { id: layer.id, type: layer.type, ...rect };
        if (['poster', 'poster-next'].includes(layer.type)) {
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
        if (layer.type === 'camera') {
          item.url = streamUrl(layer.url);
          if (!['hls', 'whep'].includes(layer.protocol))
            throw new Error('Choose HLS or WebRTC for the camera.');
          item.protocol = layer.protocol;
        }
        if (layer.type === 'input') {
          if (!INPUT_SLOTS.includes(layer.slot)) throw new Error('Choose a device input.');
          item.slot = layer.slot;
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
        if (['youtube', 'camera', 'input', 'schedule'].includes(layer.type)) {
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
