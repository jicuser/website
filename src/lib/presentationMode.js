// Simple is a view of one full-screen input, never a conversion of saved settings.
export function isSingleInputPresentation(settings) {
  if (!Array.isArray(settings?.scenes) || settings.scenes.length !== 1) return false;
  const [scene] = settings.scenes;
  if (
    scene?.id !== settings.active_scene_id ||
    !Array.isArray(scene?.layers) ||
    scene.layers.length !== 1
  ) return false;
  const [layer] = scene.layers;
  return layer?.x === 0 && layer.y === 0 && layer.width === 100 && layer.height === 100;
}
