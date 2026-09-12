import { createSceneRegions } from './sceneLayouts.js';
import { INPUT_SLOTS, MAX_SCENES } from '../../supabase/functions/_shared/tv-scenes.js';

export function createStreamScenes(count, idFactory = () => crypto.randomUUID()) {
  const size = Math.min(MAX_SCENES, Math.max(1, Math.trunc(Number(count)) || 1));
  return Array.from({ length: size }, (_, index) => ({
    id: idFactory(),
    name: `Scene ${index + 1}`,
    overlap: true,
    layers: createSceneRegions(1, 'columns', idFactory),
  }));
}

// Templates contain layout and source settings. A new scene gets fresh region IDs,
// while camera slots are checked against the other scenes in this workspace.
export function loadSceneTemplate(settings, template, idFactory = () => crypto.randomUUID()) {
  const otherSources = settings.scenes
    .filter((scene) => scene.id !== settings.active_scene_id)
    .flatMap((scene) => scene.layers)
    .filter((layer) => layer.type === 'input');
  const used = new Set(otherSources.map((layer) => layer.slot));
  const mapped = new Map();
  const layers = template.layers.map((source) => {
    const layer = { ...source, id: idFactory() };
    if (layer.type !== 'input') return layer;
    if (!mapped.has(layer.slot)) {
      const matching = otherSources.find(
        (other) =>
          other.capture === layer.capture &&
          other.name === layer.name &&
          ![...mapped.values()].includes(other.slot),
      );
      const slot = matching?.slot || INPUT_SLOTS.find((candidate) => !used.has(candidate));
      if (!slot)
        throw new Error(
          'This saved scene needs more device inputs than the four available. Remove an unused device first.',
        );
      mapped.set(layer.slot, slot);
      used.add(slot);
    }
    return { ...layer, slot: mapped.get(layer.slot) };
  });
  return {
    ...settings,
    scenes: settings.scenes.map((scene) =>
      scene.id === settings.active_scene_id
        ? { ...template, id: scene.id, overlap: true, layers }
        : scene,
    ),
  };
}

export function streamSettings(background, draft) {
  return {
    ...background,
    scenes: draft.scenes,
    active_scene_id: draft.active_scene_id,
    muted: draft.muted,
    scene_mode: 'teaching',
    class_until: '',
  };
}
