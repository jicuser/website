import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { DEFAULT_TV_SETTINGS, validateSettings } from '../supabase/functions/_shared/tv.js';

// Run the editor's handlers without starting Supabase, media, or a browser.
// Child rendering is separate; this fixture exercises draft edits and history.
const stubs = {
  '@/lib/supabaseClient': 'export const supabase = {};',
  '@/lib/imageUpload':
    'export const createImageUploader = () => async () => "https://example.test/image.png";',
  '@/components/sections/prayer-times/PrayerTimesLogic':
    'export const usePrayerTimes = () => ({});',
  '@/hooks/useHomeLiveContent': 'export default () => ({ events: [], livestream: null });',
  '@/hooks/usePosters': 'export default () => [];',
  './SceneCanvas': 'export default function SceneCanvas() { return null; }',
  '@/components/tv/TvPrayerScene': 'export default function TvPrayerScene() { return null; }',
  '@/components/tv/TvSpecialNotice': 'export default function TvSpecialNotice() { return null; }',
};
const bundled = await build({
  entryPoints: [
    new URL('../src/features/displays/TvDisplayLayoutEditor.jsx', import.meta.url).pathname,
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'editor-fixture',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) => {
          if (path.endsWith('.css')) return { path, namespace: 'empty-css' };
          if (Object.hasOwn(stubs, path)) return { path, namespace: 'fixture' };
          if (!path.startsWith('@/')) return undefined;
          const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
          return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
        });
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents: stubs[path],
        }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
      },
    },
  ],
});

function editorFixture(extra = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  const changed = (previous, next) =>
    !previous || next.some((value, i) => !Object.is(value, previous[i]));
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          const next = typeof value === 'function' ? value(slots[index]) : value;
          if (!Object.is(next, slots[index])) {
            slots[index] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ||= { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies))
        slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies)) {
        const previous = slots[index];
        slots[index] = { dependencies };
        effects.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const require = createRequire(import.meta.url);
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? hooks : require(name)),
    window: { setInterval: () => 1, clearInterval: () => {}, confirm: () => true },
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  const Editor = context.module.exports.default;
  const writes = [];
  const props = {
    screenId: 'mens-main',
    settings: structuredClone(DEFAULT_TV_SETTINGS),
    preset: 'before',
    ...extra,
    onChange: (key, value) => {
      writes.push({ key, value });
      props.settings = { ...props.settings, [key]: value };
    },
  };
  return {
    writes,
    props,
    render() {
      let tree;
      let passes = 0;
      do {
        dirty = false;
        cursor = 0;
        effects = [];
        tree = Editor(props);
        effects.forEach((effect) => effect());
        assert.ok(++passes < 10, 'editor effects settle');
      } while (dirty);
      return tree;
    },
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree) return '';
  if (Array.isArray(tree)) return tree.map(text).join('');
  return text(tree.props?.children);
}
const button = (tree, name) =>
  nodes(tree).find((node) => node.type === 'button' && text(node) === name);
const component = (tree, name) => nodes(tree).find((node) => node.type?.name === name);
const scene = (fixture) => fixture.props.settings.display_layouts.landscape[fixture.props.preset];
const select = (tree, name) =>
  nodes(nodes(tree).find((node) => node.type === 'label' && text(node).startsWith(name))).find(
    (node) => node.type === 'select',
  );

test('tapping content opens only its relevant settings and does not write a draft', () => {
  const fixture = editorFixture();
  let tree = fixture.render();
  assert.match(text(tree), /Before prayer/);
  assert.ok(nodes(tree).find((node) => node.props['aria-label'] === 'Items on this screen'));
  assert.ok(button(tree, 'Preview'));
  assert.ok(button(tree, 'Larger editor'));
  assert.equal(button(tree, 'Remove'), undefined, 'actions wait for a selection');
  assert.equal(select(tree, 'Timetable style'), undefined);
  const state = scene(fixture).layers.find((layer) => layer.type === 'state');
  component(tree, 'LayoutCanvas').props.onSelect(state.id);
  tree = fixture.render();
  assert.match(text(tree), /Before prayer message settings/);
  assert.ok(button(tree, 'Close item settings'));
  assert.ok(button(tree, 'Remove'));
  assert.ok(button(tree, 'Hide'));
  assert.equal(select(tree, 'Timetable style'), undefined);
  assert.equal(component(tree, 'LayoutCanvas').props.selectedId, state.id);
  assert.equal(fixture.writes.length, 0);
  button(tree, 'Close item settings').props.onClick();
  tree = fixture.render();
  assert.doesNotMatch(text(tree), /Before prayer message settings/);
  assert.equal(fixture.writes.length, 0);
});

test('one drag checkpoint undoes all its updates without replacing other layouts', () => {
  const fixture = editorFixture();
  const original = structuredClone(fixture.props.settings);
  let tree = fixture.render();
  const layer = scene(fixture).layers.find((item) => item.type === 'state');
  component(tree, 'LayoutCanvas').props.onSelect(layer.id);
  tree = fixture.render();
  component(tree, 'LayoutCanvas').props.onCheckpoint();
  component(tree, 'LayoutCanvas').props.onChange({ ...layer, x: 3, width: 90 });
  tree = fixture.render();
  component(tree, 'LayoutCanvas').props.onChange({ ...layer, x: 5, width: 90 });
  tree = fixture.render();
  assert.equal(fixture.writes.length, 2);
  assert.doesNotThrow(() => validateSettings(fixture.props.settings));
  assert.deepEqual(
    fixture.props.settings.display_layouts.portrait,
    original.display_layouts.portrait,
  );
  assert.deepEqual(
    fixture.props.settings.display_layouts.landscape.standby,
    original.display_layouts.landscape.standby,
  );
  button(tree, 'Undo').props.onClick();
  tree = fixture.render();
  assert.equal(
    JSON.stringify(scene(fixture)),
    JSON.stringify(original.display_layouts.landscape.before),
  );
  assert.equal(button(tree, 'Undo').props.disabled, true, 'one undo reverses the entire drag');
  assert.equal(button(tree, 'Redo').props.disabled, false);
  button(tree, 'Redo').props.onClick();
  tree = fixture.render();
  assert.equal(scene(fixture).layers.find((item) => item.id === layer.id).x, 5);
});

test('every preset item, including automatic prayer content, can be removed and restored with Undo', () => {
  for (const preset of ['standby', 'before', 'jamaah', 'dhikr', 'jummah', 'ramadan']) {
    const originalLayers = DEFAULT_TV_SETTINGS.display_layouts.landscape[preset].layers;
    for (const layer of originalLayers) {
      const fixture = editorFixture({ preset });
      let tree = fixture.render();
      component(tree, 'LayoutCanvas').props.onSelect(layer.id);
      tree = fixture.render();
      button(tree, 'Remove').props.onClick();
      tree = fixture.render();
      assert.equal(
        scene(fixture).layers.some((item) => item.id === layer.id),
        false,
        `${preset}: ${layer.type} removed`,
      );
      assert.equal(component(tree, 'LayoutCanvas').props.selectedId, '');
      assert.doesNotThrow(() => validateSettings(fixture.props.settings));
      button(tree, 'Undo').props.onClick();
      fixture.render();
      assert.equal(
        JSON.stringify(scene(fixture).layers),
        JSON.stringify(originalLayers),
        `${preset}: ${layer.type} restored`,
      );
    }
  }
});

test('cropping an uploaded image preserves its frame and saves focal position in the draft', () => {
  const settings = structuredClone(DEFAULT_TV_SETTINGS);
  const layer = settings.display_layouts.landscape.before.layers.find(
    (item) => item.type === 'state',
  );
  layer.image_url = 'https://example.test/prayer.png';
  const fixture = editorFixture({ settings });
  let tree = fixture.render();
  component(tree, 'LayoutCanvas').props.onSelect(layer.id);
  tree = fixture.render();
  button(tree, 'Crop image').props.onClick();
  tree = fixture.render();
  assert.equal(component(tree, 'LayoutCanvas').props.crop, true);
  let image = scene(fixture).layers.find((item) => item.id === layer.id);
  assert.equal(image.image_fit, 'cover');
  assert.deepEqual(JSON.parse(JSON.stringify(image.image_position)), { x: 50, y: 50 });
  component(tree, 'LayoutCanvas').props.onCheckpoint();
  component(tree, 'LayoutCanvas').props.onChange({ ...image, image_position: { x: 30, y: 70 } });
  tree = fixture.render();
  image = scene(fixture).layers.find((item) => item.id === layer.id);
  for (const key of ['x', 'y', 'width', 'height']) assert.equal(image[key], layer[key]);
  assert.deepEqual(image.image_position, { x: 30, y: 70 });
  assert.doesNotThrow(() => validateSettings(fixture.props.settings));
  select(tree, 'Image fit').props.onChange({ target: { value: 'contain' } });
  tree = fixture.render();
  assert.equal(component(tree, 'LayoutCanvas').props.crop, false);
  assert.equal(scene(fixture).layers.find((item) => item.id === layer.id).image_fit, 'contain');
});

test('preview and larger editor retain selection and never save a draft', () => {
  const fixture = editorFixture();
  let tree = fixture.render();
  const chosen = scene(fixture).layers[0].id;
  component(tree, 'LayoutCanvas').props.onSelect(chosen);
  tree = fixture.render();
  button(tree, 'Preview').props.onClick();
  tree = fixture.render();
  assert.equal(component(tree, 'TvFinalPreview').props.open, true);
  component(tree, 'TvFinalPreview').props.onClose();
  tree = fixture.render();
  assert.equal(component(tree, 'TvFinalPreview').props.open, false);
  button(tree, 'Larger editor').props.onClick();
  tree = fixture.render();
  assert.equal(component(tree, 'EditorViewport').props.expanded, true);
  component(tree, 'EditorViewport').props.onClose();
  tree = fixture.render();
  assert.equal(component(tree, 'EditorViewport').props.expanded, false);
  assert.equal(component(tree, 'LayoutCanvas').props.selectedId, chosen);
  assert.equal(fixture.writes.length, 0);
  assert.equal(button(tree, 'Undo').props.disabled, true);
});

test('hidden layers remain selectable and can be shown without rebuilding them', () => {
  const settings = structuredClone(DEFAULT_TV_SETTINGS);
  const layer = settings.display_layouts.landscape.before.layers[0];
  layer.hidden = true;
  const fixture = editorFixture({ settings });
  let tree = fixture.render();
  const item = nodes(tree).find(
    (node) => node.type === 'button' && node.props['data-layer-id'] === layer.id,
  );
  assert.match(text(item), /hidden/);
  item.props.onClick();
  tree = fixture.render();
  assert.equal(fixture.writes.length, 0);
  assert.ok(button(tree, 'Show'));
  button(tree, 'Show').props.onClick();
  fixture.render();
  const restored = scene(fixture).layers.find((item) => item.id === layer.id);
  assert.equal(restored.hidden, false);
  assert.equal(restored.type, layer.type);
  for (const key of ['x', 'y', 'width', 'height']) assert.equal(restored[key], layer[key]);
});

test('changing, hiding or restoring a cropped image exits cropping before further edits', () => {
  for (const action of ['change type', 'hide', 'restore message']) {
    const settings = structuredClone(DEFAULT_TV_SETTINGS);
    const layer = settings.display_layouts.landscape.before.layers.find(
      (item) => item.type === 'state',
    );
    layer.image_url = 'https://example.test/prayer.png';
    const fixture = editorFixture({ settings });
    let tree = fixture.render();
    component(tree, 'LayoutCanvas').props.onSelect(layer.id);
    tree = fixture.render();
    button(tree, 'Crop image').props.onClick();
    tree = fixture.render();
    assert.equal(component(tree, 'LayoutCanvas').props.crop, true);
    if (action === 'change type') {
      select(tree, 'Item type').props.onChange({ target: { value: 'text' } });
    } else {
      button(tree, action === 'hide' ? 'Hide' : 'Restore prayer message').props.onClick();
    }
    tree = fixture.render();
    assert.equal(component(tree, 'LayoutCanvas').props.crop, false, action);
    assert.equal(button(tree, 'Done cropping'), undefined);
    if (action === 'hide') {
      assert.equal(button(tree, 'Crop image').props.disabled, true);
      button(tree, 'Show').props.onClick();
      tree = fixture.render();
      assert.equal(
        component(tree, 'LayoutCanvas').props.crop,
        false,
        'showing the item does not restart cropping',
      );
    } else {
      assert.equal(button(tree, 'Crop image'), undefined, action);
      assert.equal(select(tree, 'Image fit'), undefined);
    }
    const content = scene(fixture).layers.find((item) => item.id === layer.id);
    assert.equal(content.type, action === 'change type' ? 'text' : 'state');
    component(tree, 'LayoutCanvas').props.onCheckpoint();
    component(tree, 'LayoutCanvas').props.onChange({ ...content, x: 5, width: 90 });
    fixture.render();
    const moved = scene(fixture).layers.find((item) => item.id === layer.id);
    assert.equal(moved.x, 5);
    assert.equal(moved.width, 90);
    assert.deepEqual(
      moved.image_position,
      content.image_position,
      'ordinary positioning does not alter the crop',
    );
  }
});
