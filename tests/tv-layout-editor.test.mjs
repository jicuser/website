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
  '@/lib/imageUpload': 'export const createImageUploader = () => async () => "https://example.test/image.png";',
  '@/components/sections/prayer-times/PrayerTimesLogic': 'export const usePrayerTimes = () => ({});',
  '@/hooks/useHomeLiveContent': 'export default () => ({ events: [], livestream: null });',
  '@/hooks/usePosters': 'export default () => [];',
  './SceneCanvas': 'export default function SceneCanvas() { return null; }',
  '@/components/tv/TvPrayerScene': 'export default function TvPrayerScene() { return null; }',
  '@/components/tv/TvSpecialNotice': 'export default function TvSpecialNotice() { return null; }',
};
const bundled = await build({
  entryPoints: [new URL('../src/features/displays/TvDisplayLayoutEditor.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [{
    name: 'editor-fixture',
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => {
        if (Object.hasOwn(stubs, path)) return { path, namespace: 'fixture' };
        if (!path.startsWith('@/')) return undefined;
        const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
        return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
      });
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: stubs[path] }));
    },
  }],
});

function editorFixture(extra = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  const changed = (previous, next) => !previous || next.some((value, i) => !Object.is(value, previous[i]));
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value) => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ||= { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies)) slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies)) {
        const previous = slots[index];
        slots[index] = { dependencies };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
  };
  const require = createRequire(import.meta.url);
  const context = {
    module: { exports: {} },
    require: (name) => name === 'react' ? hooks : require(name),
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
const button = (tree, name) => nodes(tree).find((node) => node.type === 'button' && text(node) === name);
const byClass = (tree, name) => nodes(tree).find((node) => node.props?.className?.split(' ').includes(name));
const select = (tree, name) => nodes(nodes(tree).find((node) => node.type === 'label' && text(node).startsWith(name)))
  .find((node) => node.type === 'select');

test('choosing content keeps the preview clear and never writes a draft', () => {
  const fixture = editorFixture();
  let tree = fixture.render();
  assert.match(text(tree), /Before prayer/);
  assert.ok(select(tree, 'Content to edit'));
  assert.ok(button(tree, 'Full-screen preview'));
  assert.equal(byClass(tree, 'tv-layout-box'), undefined);
  assert.equal(byClass(tree, 'tv-layout-grid'), undefined);
  const state = fixture.props.settings.display_layouts.landscape.before.layers.find((layer) => layer.type === 'state');
  select(tree, 'Content to edit').props.onChange({ target: { value: state.id } });
  tree = fixture.render();
  assert.match(text(tree), /Before prayer message settings/);
  assert.equal(select(tree, 'Timetable style'), undefined);
  assert.equal(byClass(tree, 'tv-layout-box'), undefined);
  assert.equal(fixture.writes.length, 0);
});

test('moving content is explicit, bounded and undoable, without replacing other layouts', () => {
  const fixture = editorFixture();
  let tree = fixture.render();
  const settingsBefore = structuredClone(fixture.props.settings);
  button(tree, 'Move & resize').props.onClick();
  tree = fixture.render();
  assert.ok(byClass(tree, 'tv-layout-grid'));
  assert.equal(nodes(tree).filter((node) => node.props?.className?.includes('tv-layout-box')).length, 1);
  assert.equal(nodes(tree).filter((node) => node.type === 'input' && node.props.type === 'number').length, 4);
  const moving = byClass(tree, 'tv-layout-box');
  moving.props.onKeyDown({ key: 'ArrowDown', shiftKey: false, preventDefault() {} });
  tree = fixture.render();
  assert.equal(fixture.writes.length, 1);
  assert.doesNotThrow(() => validateSettings(fixture.props.settings));
  assert.deepEqual(fixture.props.settings.display_layouts.portrait, settingsBefore.display_layouts.portrait);
  assert.deepEqual(fixture.props.settings.display_layouts.landscape.standby, settingsBefore.display_layouts.landscape.standby);
  assert.notEqual(JSON.stringify(fixture.props.settings.display_layouts.landscape.before), JSON.stringify(settingsBefore.display_layouts.landscape.before));
  assert.equal(button(tree, 'Undo').props.disabled, false);
  button(tree, 'Undo').props.onClick();
  tree = fixture.render();
  assert.equal(JSON.stringify(fixture.props.settings.display_layouts.landscape.before), JSON.stringify(settingsBefore.display_layouts.landscape.before));
  assert.equal(button(tree, 'Redo').props.disabled, false);
  button(tree, 'Done positioning').props.onClick();
  tree = fixture.render();
  assert.equal(byClass(tree, 'tv-layout-box'), undefined);
});

test('opening and closing full-screen preview retains editor selection and never saves', () => {
  const fixture = editorFixture();
  let tree = fixture.render();
  const chosen = select(tree, 'Content to edit').props.value;
  button(tree, 'Full-screen preview').props.onClick();
  tree = fixture.render();
  const preview = nodes(tree).find((node) => node.type?.name === 'TvFinalPreview');
  assert.equal(preview.props.open, true);
  assert.ok(button(tree, 'Full-screen preview'), 'trigger remains mounted for focus restoration');
  preview.props.onClose();
  tree = fixture.render();
  assert.equal(select(tree, 'Content to edit').props.value, chosen);
  assert.equal(nodes(tree).find((node) => node.type?.name === 'TvFinalPreview').props.open, false);
  assert.equal(fixture.writes.length, 0);
});

test('tapping a selected item does not create an empty undo step, and another layout exits positioning', () => {
  const fixture = editorFixture();
  let tree = fixture.render();
  button(tree, 'Move & resize').props.onClick();
  tree = fixture.render();
  byClass(tree, 'tv-layout-canvas').ref.current = {
    getBoundingClientRect: () => ({ width: 320, height: 180 }),
  };
  const item = byClass(tree, 'tv-layout-box');
  const pointer = {
    button: 0, clientX: 50, clientY: 50, pointerId: 1,
    preventDefault() {}, stopPropagation() {}, currentTarget: { setPointerCapture() {} },
  };
  item.props.onPointerDown(pointer);
  item.props.onPointerMove({ ...pointer, clientX: 51 });
  item.props.onPointerUp(pointer);
  tree = fixture.render();
  assert.equal(button(tree, 'Undo').props.disabled, true);
  assert.equal(fixture.writes.length, 0);
  fixture.props.preset = 'jamaah';
  tree = fixture.render();
  assert.equal(byClass(tree, 'tv-layout-box'), undefined);
  assert.equal(byClass(tree, 'tv-layout-grid'), undefined);
  assert.match(text(tree), /Prayer in progress/);
});
