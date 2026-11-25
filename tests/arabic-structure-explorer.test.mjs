import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { HARAKAT } from '../src/features/arabic/arabicGlyphModel.mjs';

const require = createRequire(import.meta.url);
const bundle = await build({
  entryPoints: [
    new URL('../src/features/arabic/ArabicStructureExplorer.jsx', import.meta.url).pathname,
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'ignore-style-only-imports',
      setup(builder) {
        builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({ path, namespace: 'empty-css' }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
      },
    },
  ],
});

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const hookState = () => ({ slots: [], cursor: 0, layout: [], passive: [] });
const changed = (old, next) => !old || next.some((value, index) => !Object.is(value, old[index]));
const rect = (left, top, width, height) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// Run the real explorer and outline components. The small fixture models the
// commit order relevant to this regression: detach changed host refs, run the
// child's layout measurement, then attach the parent's changed host ref.
function fixture(initial) {
  const rootHooks = hookState();
  let layerHooks = hookState(),
    active = rootHooks,
    tree,
    layerTree,
    oldRootRef;
  let ink = [],
    frameId = 0;
  const frames = new Map();
  const effect = (queue, callback, deps) => {
    const hooks = active,
      index = hooks.cursor++,
      old = hooks.slots[index];
    if (changed(old?.deps, deps)) {
      const slot = { deps };
      hooks.slots[index] = slot;
      hooks[queue].push(() => {
        old?.cleanup?.();
        slot.cleanup = callback();
      });
    }
  };
  const runtime = {
    ...React,
    useState(initialValue) {
      const hooks = active,
        index = hooks.cursor++;
      if (!(index in hooks.slots))
        hooks.slots[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [
        hooks.slots[index],
        (value) => {
          hooks.slots[index] = typeof value === 'function' ? value(hooks.slots[index]) : value;
        },
      ];
    },
    useRef(initialValue) {
      const index = active.cursor++;
      return (active.slots[index] ||= { current: initialValue });
    },
    useMemo(callback, deps) {
      const index = active.cursor++,
        old = active.slots[index];
      if (changed(old?.deps, deps)) active.slots[index] = { deps, value: callback() };
      return active.slots[index].value;
    },
    useCallback(callback, deps) {
      return this.useMemo(() => callback, deps);
    },
    useId() {
      return `structure-fixture-${active.cursor++}`;
    },
    useEffect(callback, deps) {
      effect('passive', callback, deps);
    },
    useLayoutEffect(callback, deps) {
      effect('layout', callback, deps);
    },
  };
  // Named hook imports call functions without a receiver.
  runtime.useCallback = (callback, deps) => runtime.useMemo(() => callback, deps);
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? runtime : require(name)),
    window: { addEventListener() {}, removeEventListener() {} },
    document: {},
    requestAnimationFrame(callback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  };
  runInNewContext(bundle.outputFiles[0].text, context);
  const Component = context.module.exports.default;
  const control = {
    dataset: { connectionControl: 'structure-mark' },
    getBoundingClientRect: () => rect(110, 290, 1, 1),
  };
  const container = {
    getBoundingClientRect: () => rect(100, 100, 320, 200),
    querySelectorAll(query) {
      if (query === '[data-connection-control]') return [control];
      return query === '.arabic-script .arabic-glyph-ink[data-part]' ? ink : [];
    },
  };
  const props = {
    mode: 'noun',
    selector: null,
    ...initial,
    onSelect(next) {
      props.selector = next;
      props.children = next ? React.createElement('div', { role: 'region' }, 'Choices') : null;
    },
  };
  const renderLayer = (element) => {
    active = layerHooks;
    layerHooks.cursor = 0;
    layerHooks.layout = [];
    layerTree = element.type(element.props);
    layerHooks.layout.splice(0).forEach((callback) => callback());
  };
  return {
    props,
    render() {
      active = rootHooks;
      rootHooks.cursor = 0;
      rootHooks.passive = [];
      tree = Component(props);
      const root = nodes(tree).find((node) => node.props?.['data-structure-node'] === 'sentence');
      const result = nodes(root).find((node) => node.type?.name === 'ArabicGlyphs').props.result;
      const word = {};
      let sourceIndex = 0;
      ink = result.segments.flatMap((segment) =>
        Array.from(segment.arabic, (character) => {
          const index = sourceIndex++;
          return /\s/u.test(character)
            ? null
            : {
                dataset: { part: segment.id, sourceIndex: String(index) },
                closest: () => word,
                getBoundingClientRect: () =>
                  rect(140 + index * 3, HARAKAT[character] ? 135 : 145, 7, 8),
              };
        }).filter(Boolean),
      );
      if (oldRootRef && oldRootRef !== root.ref) oldRootRef(null);
      const layer = nodes(tree).find((node) => node.type?.name === 'ArabicConnectionLayer');
      if (layer) renderLayer(layer);
      else {
        layerHooks.slots.forEach((slot) => slot?.cleanup?.());
        layerHooks = hookState();
        layerTree = null;
      }
      if (oldRootRef !== root.ref) root.ref(container);
      oldRootRef = root.ref;
      rootHooks.passive.splice(0).forEach((callback) => callback());
      for (let turn = 0; frames.size && turn < 4; turn += 1) {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback());
      }
      if (layer) renderLayer(layer);
      return this;
    },
    clickNode(id) {
      const button = nodes(tree).find(
        (node) => node.type === 'button' && node.props['data-structure-node'] === id,
      );
      assert.ok(button, `the actual ${id} control is mounted`);
      button.props.onClick();
      return this.render();
    },
    tapMark(partId, character) {
      const glyphs = nodes(tree).find((node) => node.type?.name === 'ArabicGlyphs');
      let start = 0,
        index;
      for (const segment of glyphs.props.result.segments) {
        if (segment.id === partId) index = start + segment.arabic.indexOf(character);
        start += segment.arabic.length;
      }
      assert.ok(index >= 0, 'the actual source mark exists');
      glyphs.props.onPartClick(partId, {
        sourceIndex: index,
        character,
        mark: HARAKAT[character].id,
      });
      this.render();
      return index;
    },
    assertOutline(partId, sourceIndex) {
      assert.ok(layerTree, 'a measured outline remains mounted after the selection commit');
      assert.equal(layerTree.props['data-connection-part'], partId);
      assert.equal(layerTree.props['data-connection-source-index'], sourceIndex);
      const rings = nodes(layerTree).filter((node) => node.type === 'ellipse');
      assert.equal(rings.length, 1);
      assert.equal(rings[0].props['data-part'], partId);
      const targets = ink.filter(
        (group) =>
          group.dataset.part === partId &&
          (sourceIndex == null || Number(group.dataset.sourceIndex) === sourceIndex),
      );
      const boxes = targets.map((group) => group.getBoundingClientRect());
      const midpoint =
        (Math.min(...boxes.map((box) => box.left)) + Math.max(...boxes.map((box) => box.right))) /
          2 -
        100;
      assert.equal(rings[0].props.cx, midpoint, 'the ring measures the currently selected ink');
    },
    get tree() {
      return tree;
    },
    get layer() {
      return layerTree;
    },
  };
}

test('a direct noun vowel tap mounts its outline and follows context source shifts', () => {
  const ui = fixture({ noun: { nounId: 'bayt', ownerId: 'our', contextId: 'this' } }).render();
  const first = ui.tapMark('case', 'ُ');
  ui.assertOutline('case', first);
  for (const [contextId, character] of [
    ['saw', 'َ'],
    ['in', 'ِ'],
  ]) {
    ui.props.noun = { ...ui.props.noun, contextId };
    ui.render();
    const result = nodes(ui.tree).find((node) => node.type?.name === 'ArabicGlyphs').props.result;
    const caseIndex = result.arabic.lastIndexOf(character, result.arabic.indexOf('نَا'));
    ui.assertOutline('case', caseIndex);
  }
});

test('a directly tapped verb-ending vowel retains its own outline, then clears when removed', () => {
  const ui = fixture({
    mode: 'verb',
    verb: { verbId: 'kataba', personId: 'you_f', tenseId: 'present' },
  }).render();
  const source = ui.tapMark('ending', 'ِ');
  ui.assertOutline('ending', source);
  ui.tapMark('ending', 'ِ');
  ui.assertOutline('ending', source);
  ui.props.verb = { ...ui.props.verb, personId: 'he' };
  ui.render();
  assert.equal(ui.layer, null, 'a removed ending cannot transfer its focus to the prefix');
});

test('the fixed -tu ending shows an outline and explanation without needing a choice tray', () => {
  const ui = fixture({ noun: { nounId: 'bayt', ownerId: 'my', contextId: 'saw' } }).render();
  ui.clickNode('word:context:0').clickNode('part:context:ending');
  assert.equal(ui.props.selector, null);
  assert.ok(nodes(ui.tree).some((node) => node.props?.className === 'arabic-structure-part-note'));
  ui.assertOutline('context:ending', undefined);
});

test('a cropped owner vowel has a padded touch target behind its original ink', () => {
  const ui = fixture({ noun: { nounId: 'bayt', ownerId: 'his', contextId: 'in' } }).render();
  const source = nodes(ui.tree).find(
    (node) => node.type?.name === 'SourcePart' && node.props.node.id === 'part:owner',
  );
  const crop = source.type(source.props);
  const descendants = nodes(crop);
  const target = descendants.find(
    (node) =>
      node.props?.className === 'arabic-structure-crop-target' &&
      node.props['data-mark'] === 'kasra',
  );
  assert.ok(target, 'the tiny cropped kasra has its own touch region');
  const index = target.props['data-source-index'];
  assert.equal(index, 11, 'the crop retains the global source index in fī baytihi');
  const original = source.props.shaped.tokens
    .flatMap((token) => token.items || [])
    .flatMap((word) => word.groups || [])
    .find((group) => group.sourceIndex === index);
  const hit = nodes(target).find((node) => node.type === 'rect').props;
  assert.ok(hit.x < original.bounds[0] && hit.y < original.bounds[1]);
  assert.ok(hit.x + hit.width > original.bounds[2] && hit.y + hit.height > original.bounds[3]);
  assert.equal(hit.pointerEvents, 'all');
  const originalInk = descendants.find(
    (node) =>
      node.props?.className?.includes('arabic-structure-crop-ink') &&
      node.props['data-source-index'] === index,
  );
  assert.ok(
    descendants.indexOf(target) < descendants.indexOf(originalInk),
    'real ink remains above the padded hit layer',
  );
  let stopped = false;
  target.props.onClick({
    stopPropagation() {
      stopped = true;
    },
  });
  assert.equal(stopped, true, 'a vowel hit must not activate the whole owner card');
  ui.render();
  ui.assertOutline('owner', index);
});
