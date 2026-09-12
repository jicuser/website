import { activeTvScene } from '../../supabase/functions/_shared/tv.js';
import { INPUT_SLOTS } from '../../supabase/functions/_shared/tv-scenes.js';

// Keep inputs mounted when switching scenes so an ongoing camera feed is not stopped.
// The selected scene determines which capture controls the operator sees first.
export function tvInputSources(settings) {
  const active = activeTvScene(settings);
  const scenes = [active, ...(settings.scenes || []).filter((scene) => scene !== active)].filter(
    Boolean,
  );
  const sources = new Map();
  for (const scene of scenes) {
    for (const layer of scene.layers) {
      if (layer.type !== 'input') continue;
      const existing = sources.get(layer.slot);
      if (!existing) {
        sources.set(layer.slot, {
          slot: layer.slot,
          capture: layer.capture,
          active: scene === active,
          conflict: false,
        });
      } else if (layer.capture && existing.capture && layer.capture !== existing.capture) {
        existing.conflict = true;
      }
    }
  }
  return [...sources.values()];
}

export function updateInputCapture(settings, slot, capture) {
  return {
    ...settings,
    scenes: settings.scenes.map((scene) => ({
      ...scene,
      layers: scene.layers.map((layer) =>
        layer.type === 'input' && layer.slot === slot ? { ...layer, capture } : layer,
      ),
    })),
  };
}

export function availableInputSlot(settings, capture) {
  const active = activeTvScene(settings);
  const used = new Set(
    active?.layers.filter((layer) => layer.type === 'input').map((layer) => layer.slot),
  );
  return INPUT_SLOTS.find(
    (slot) =>
      !used.has(slot) &&
      settings.scenes.every((scene) =>
        scene.layers.every(
          (layer) =>
            layer.type !== 'input' ||
            layer.slot !== slot ||
            !layer.capture ||
            layer.capture === capture,
        ),
      ),
  );
}
