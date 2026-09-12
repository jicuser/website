import { fitRect } from '../../supabase/functions/_shared/tv-scenes.js';

export const SCENE_LAYOUTS = [
  ['columns', 'Side by side'],
  ['grid', 'Grid'],
  ['focus', 'Large area with sidebar'],
  ['pip', 'Picture in picture'],
];

const box = (x, y, width, height) => ({ x, y, width, height });
const countInRange = (count) => Math.min(4, Math.max(1, Number(count) || 1));

export function layoutRegions(count, preset = 'columns') {
  const total = Math.trunc(countInRange(count));
  if (total === 1) return [box(0, 0, 100, 100)];
  if (preset === 'pip')
    return [
      box(0, 0, 100, 100),
      ...Array.from({ length: total - 1 }, (_, i) => box(70, 4 + i * 32, 28, 28)),
    ];
  if (preset === 'focus')
    return [
      box(0, 0, 70, 100),
      ...Array.from({ length: total - 1 }, (_, i) =>
        box(70, (i * 100) / (total - 1), 30, 100 / (total - 1)),
      ),
    ];
  if (preset === 'grid' && total > 2)
    return [
      box(0, 0, 50, 50),
      box(50, 0, 50, 50),
      ...(total === 3 ? [box(0, 50, 100, 50)] : [box(0, 50, 50, 50), box(50, 50, 50, 50)]),
    ];
  return Array.from({ length: total }, (_, i) => box((i * 100) / total, 0, 100 / total, 100));
}

export function createSceneRegions(
  count = 1,
  preset = 'columns',
  idFactory = () => crypto.randomUUID(),
) {
  return layoutRegions(count, preset).map((rect) => ({ id: idFactory(), type: 'empty', ...rect }));
}

// Keep content and device references when applying a new arrangement.
export function arrangeScene(
  scene,
  count,
  preset = 'columns',
  idFactory = () => crypto.randomUUID(),
) {
  return {
    ...scene,
    overlap: true,
    layers: layoutRegions(count, preset).map((rect, index) => ({
      ...(scene.layers[index] || { id: idFactory(), type: 'empty' }),
      ...rect,
    })),
  };
}

export function clearRegion(layer) {
  return { id: layer.id, type: 'empty', ...fitRect(layer) };
}

function nearest(value, guides, tolerance) {
  const found = guides.reduce(
    (best, guide) => (Math.abs(guide - value) < Math.abs(best - value) ? guide : best),
    Infinity,
  );
  return Math.abs(found - value) <= tolerance ? found : value;
}

// Snap only within a small distance so free positioning remains predictable.
export function snapRect(rect, others = [], { resize = false, tolerance = 1.5 } = {}) {
  const fitted = fitRect(
    resize
      ? {
          ...rect,
          width: Math.min(rect.width, 100 - rect.x),
          height: Math.min(rect.height, 100 - rect.y),
        }
      : rect,
  );
  const grid = Array.from({ length: 21 }, (_, index) => index * 5);
  const xs = [...grid, ...others.flatMap((item) => [item.x, item.x + item.width])];
  const ys = [...grid, ...others.flatMap((item) => [item.y, item.y + item.height])];
  if (resize)
    return fitRect({
      ...fitted,
      width: nearest(fitted.x + fitted.width, xs, tolerance) - fitted.x,
      height: nearest(fitted.y + fitted.height, ys, tolerance) - fitted.y,
    });
  return fitRect({
    ...fitted,
    x: nearest(fitted.x, [...xs, ...xs.map((edge) => edge - fitted.width)], tolerance),
    y: nearest(fitted.y, [...ys, ...ys.map((edge) => edge - fitted.height)], tolerance),
  });
}
