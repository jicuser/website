import { nameProblem } from './tv-scenes.js';
import { validateSettings } from './tv.js';

export function streamSetupProblem(settings) {
  if (!Array.isArray(settings?.scenes) || !settings.scenes.length) return 'Add a scene first.';
  for (const [index, scene] of settings.scenes.entries()) {
    const problem = nameProblem(scene?.name, `name for scene ${index + 1}`);
    if (problem) return problem;
    for (const layer of scene.layers || []) {
      if (layer.type === 'input' && nameProblem(layer.name, 'device name')) return nameProblem(layer.name, 'device name');
    }
    if (!scene.layers?.length || scene.layers.some((layer) => layer.type === 'empty'))
      return `Select an input type for every input in “${scene.name}” before saving.`;
  }
  return '';
}

// Keep reusable configuration only, never a viewer credential or a live capture lease.
export function streamTemplateSettings(input, screenId) {
  const problem = streamSetupProblem(input);
  if (problem) throw new Error(problem);
  const checked = validateSettings({ ...input, scene_mode: 'teaching', class_until: '' }, screenId);
  return { scenes: checked.scenes, active_scene_id: checked.active_scene_id, muted: checked.muted };
}
