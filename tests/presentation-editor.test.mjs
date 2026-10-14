import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

// Exercise real editor handlers/history while keeping media and network children inert.
const stubs = {
  '@/components/sections/prayer-times/PrayerTimesLogic':
    'export const usePrayerTimes = () => ({});',
  '@/hooks/useHomeLiveContent': 'export default () => ({ livestream: null });',
  '@/hooks/useTvPreview': 'export default () => ({});',
  '@/hooks/useTvPublisher': 'export default () => ({});',
  '@/lib/tvControl': 'export const tvRequest = async () => ({});',
  '@/lib/tvCapture': 'export const captureProblem = () => null;',
  '@/lib/captureLease': 'export const readCaptureLease = () => null;',
  './SceneCanvas': 'export default function SceneCanvas() { return null; }',
  './LayoutCanvas': 'export default function LayoutCanvas() { return null; }',
  './ContentEditorDialog': 'export default function ContentEditorDialog() { return null; }',
};
async function compile(name) {
  const bundle = await build({
    entryPoints: [new URL(`../src/features/displays/${name}.jsx`, import.meta.url).pathname],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    plugins: [
      {
        name: 'presentation-fixture',
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            if (Object.hasOwn(stubs, path)) return { path, namespace: 'fixture' };
            if (!path.startsWith('@/')) return undefined;
            const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
            return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
          });
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents: stubs[path],
          }));
        },
      },
    ],
  });
  return bundle.outputFiles[0].text;
}
const [editorCode, deviceCode] = await Promise.all([
  compile('SceneEditor'),
  compile('DeviceInputs'),
]);

function fixture(code, props) {
  const slots = [];
  let cursor = 0,
    dirty = false,
    effects = [];
  const changed = (previous, next) =>
    !previous || next.some((value, index) => !Object.is(value, previous[index]));
  const hooks = {
    ...React,
    useId: () => 'editor-fixture',
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
    setInterval: () => 1,
    clearInterval: () => {},
    window: { confirm: () => true },
  };
  runInNewContext(code, context);
  const Component = context.module.exports.default;
  return {
    props,
    render() {
      let tree,
        passes = 0;
      do {
        cursor = 0;
        dirty = false;
        effects = [];
        tree = Component(props);
        effects.forEach((effect) => effect());
        assert.ok(++passes < 10, 'effects settle');
      } while (dirty);
      return tree;
    },
  };
}
const source = (id = 'camera', extra = {}) => ({
  id,
  type: 'input',
  slot: 'input-1',
  name: 'Hall camera',
  capture: 'camera',
  audio: false,
  x: 0,
  y: 0,
  width: 50,
  height: 100,
  ...extra,
});
const settings = (layers = [source()]) => ({
  ...structuredClone(DEFAULT_TV_SETTINGS),
  scene_mode: 'teaching',
  active_scene_id: 'main',
  scenes: [{ id: 'main', name: 'Main view', overlap: true, layers }],
});
function editor(extra = {}) {
  const props = {
    value: settings(),
    screenId: 'mens-main',
    initialMode: 'advanced',
    ...extra,
    onChange: (value) => {
      props.value = value;
    },
  };
  return fixture(editorCode, props);
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
  nodes(tree).find((node) => node.type === 'button' && text(node).trim() === name);
const child = (tree, name) => nodes(tree).find((node) => node.type?.name === name);
const canvas = (tree) => child(tree, 'LayoutCanvas');
const json = (value) => JSON.stringify(value);

test('advanced input tap selects controls without opening the editor or changing the draft', () => {
  const ui = editor();
  const before = json(ui.props.value);
  let tree = ui.render();
  canvas(tree).props.onSelect('camera');
  tree = ui.render();
  assert.equal(canvas(tree).props.selectedId, 'camera');
  assert.ok(button(tree, 'Edit input'));
  assert.ok(button(tree, 'Remove input'));
  assert.equal(child(tree, 'ContentEditorDialog'), undefined);
  assert.equal(json(ui.props.value), before);
  canvas(tree).props.onEdit(ui.props.value.scenes[0].layers[0]);
  assert.ok(child(ui.render(), 'ContentEditorDialog'));
});

test('simple input opens editing in one tap and has no draggable selection', () => {
  const ui = editor({ initialMode: 'simple', value: settings([source('camera', { width: 100 })]) });
  let tree = ui.render();
  canvas(tree).props.onSelect('camera');
  tree = ui.render();
  assert.ok(child(tree, 'ContentEditorDialog'));
  assert.equal(canvas(tree).props.selectedId, '');
  assert.equal(button(tree, 'Undo').props.disabled, true);
});

test('one drag is one undo step and preserves settings outside scenes', () => {
  const ui = editor();
  const before = json(ui.props.value.scenes);
  let tree = ui.render();
  canvas(tree).props.onCheckpoint();
  canvas(tree).props.onChange(source('camera', { x: 10, width: 40 }));
  tree = ui.render();
  canvas(tree).props.onChange(source('camera', { x: 20, width: 30 }));
  tree = ui.render();
  ui.props.value = { ...ui.props.value, muted: false };
  tree = ui.render();
  button(tree, 'Undo').props.onClick();
  tree = ui.render();
  assert.equal(json(ui.props.value.scenes), before);
  assert.equal(ui.props.value.muted, false);
  assert.equal(button(tree, 'Undo').props.disabled, true);
  assert.equal(button(tree, 'Redo').props.disabled, false);
  button(tree, 'Redo').props.onClick();
  assert.equal(ui.props.value.scenes[0].layers[0].x, 20);
});

test('removing the last input leaves a selectable empty region and is undoable', () => {
  const ui = editor();
  const before = json(ui.props.value.scenes);
  let tree = ui.render();
  canvas(tree).props.onSelect('camera');
  tree = ui.render();
  button(tree, 'Remove input').props.onClick();
  tree = ui.render();
  const empty = ui.props.value.scenes[0].layers[0];
  assert.equal(empty.type, 'empty');
  assert.equal(empty.slot, undefined);
  assert.equal(empty.id, 'camera');
  assert.equal(canvas(tree).props.selectedId, '');
  button(tree, 'Undo').props.onClick();
  assert.equal(json(ui.props.value.scenes), before);
});

test('removing one of several inputs does not rearrange the others', () => {
  const ui = editor({
    value: settings([
      source(),
      { id: 'notice', type: 'text', text: 'Welcome', x: 50, y: 5, width: 45, height: 90 },
    ]),
  });
  const retained = json(ui.props.value.scenes[0].layers[1]);
  let tree = ui.render();
  canvas(tree).props.onSelect('camera');
  tree = ui.render();
  button(tree, 'Remove input').props.onClick();
  assert.equal(ui.props.value.scenes[0].layers.length, 1);
  assert.equal(json(ui.props.value.scenes[0].layers[0]), retained);
});

test('scene changes clear stale selection and open content editor', () => {
  const value = settings();
  value.scenes.push({ id: 'second', name: 'Second view', layers: [source('second-camera')] });
  const ui = editor({ value });
  let tree = ui.render();
  canvas(tree).props.onEdit(value.scenes[0].layers[0]);
  tree = ui.render();
  assert.ok(child(tree, 'ContentEditorDialog'));
  ui.props.value = { ...value, active_scene_id: 'second' };
  tree = ui.render();
  assert.equal(canvas(tree).props.selectedId, '');
  assert.equal(child(tree, 'ContentEditorDialog'), undefined);
});

test('undoing a device content change restores its shared name in every scene', () => {
  const value = settings();
  value.scenes.push({ id: 'second', name: 'Second view', layers: [source('second-camera')] });
  const ui = editor({ value });
  let tree = ui.render();
  canvas(tree).props.onEdit(value.scenes[0].layers[0]);
  tree = ui.render();
  child(tree, 'ContentEditorDialog').props.onChange({
    ...value,
    scenes: value.scenes.map((scene) => ({
      ...scene,
      layers: scene.layers.map((layer) => ({ ...layer, name: 'Replacement camera' })),
    })),
  });
  tree = ui.render();
  button(tree, 'Undo').props.onClick();
  for (const scene of ui.props.value.scenes) assert.equal(scene.layers[0].name, 'Hall camera');
});

function devices(extra = {}) {
  return fixture(deviceCode, {
    settings: settings(),
    savedSettings: settings(),
    screenId: 'mens-main',
    embedded: true,
    presentationId: 'live-lesson',
    ...extra,
  });
}
const controls = (tree) => nodes(tree).filter((node) => node.type?.name === 'DeviceInput');

test('removing a draft source keeps its live capture controller mounted until publishing', () => {
  const ui = devices();
  const initial = controls(ui.render())[0];
  ui.props.settings = settings([
    { id: 'empty', type: 'empty', x: 0, y: 0, width: 100, height: 100 },
  ]);
  let current = controls(ui.render());
  assert.equal(current.length, 1);
  assert.equal(current[0].key, initial.key);
  assert.equal(current[0].props.setupOnly, false);
  assert.equal(current[0].props.capture, 'camera');
  ui.props.savedSettings = ui.props.settings;
  assert.equal(controls(ui.render()).length, 0);
});

test('changing a draft capture type does not reconfigure the live controller before publishing', () => {
  const ui = devices({ settings: settings([source('camera', { capture: 'screen' })]) });
  let current = controls(ui.render())[0];
  assert.equal(current.props.capture, 'camera');
  assert.equal(current.props.pendingChange, true);
  assert.equal(current.props.setupOnly, false);
  ui.props.savedSettings = ui.props.settings;
  current = controls(ui.render())[0];
  assert.equal(current.props.capture, 'screen');
  assert.equal(current.props.pendingChange, undefined);
});

test('new presentation drafts never mount unrelated saved sources', () => {
  const ui = devices({ settings: settings([]), setupOnly: true });
  assert.equal(controls(ui.render()).length, 0);
});
