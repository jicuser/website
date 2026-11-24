import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';

const require = createRequire(import.meta.url);
const compiled = await build({
  entryPoints: [
    new URL('../src/features/arabic/ArabicConnectionLayer.jsx', import.meta.url).pathname,
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
});

const rect = (left, top, width, height) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

// Exercise the real layer with a controlled rendering clock. The layout fixture
// can move inline ink after paint while its containing row keeps the same size.
function layerFixture() {
  const slots = [];
  const frames = new Map();
  const observers = [];
  const listeners = new Map();
  let cursor = 0,
    frameId = 0,
    effects = [],
    tree;
  let ink = rect(149, 120, 10.0864, 10.1993);
  const contextRun = {},
    contextWord = {},
    nounRun = {},
    nounWord = {},
    script = {};
  const control = {
    dataset: { connectionControl: 'part-case' },
    getBoundingClientRect: () => rect(160, 330, 70, 44),
  };
  const glyph = {
    dataset: { part: 'case', sourceIndex: '11' },
    closest: () => nounWord,
    getBoundingClientRect: () => ink,
  };
  const container = {
    getBoundingClientRect: () => rect(21, 80, 348, 370),
    querySelectorAll(selector) {
      if (selector === '[data-connection-control]') return [control];
      if (selector.includes('.arabic-glyph-ink')) return [glyph];
      return [
        script,
        ...(selector.includes('.arabic-glyph-run') ? [contextRun, nounRun] : []),
        ...(selector.includes('.arabic-glyph-word') ? [contextWord, nounWord] : []),
        control,
      ];
    },
  };
  const props = {
    containerRef: { current: container },
    controlKey: 'part-case',
    partIds: ['case'],
    sourceIndex: 11,
    measureKey: 'هَذَا بَيْتُنَا',
  };
  const runtime = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
    useLayoutEffect(effect, deps) {
      const index = cursor++;
      const old = slots[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        slots[index] = { deps };
        effects.push(() => {
          old?.cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? runtime : require(name)),
    document: {},
    window: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
    },
    requestAnimationFrame(callback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    ResizeObserver: class {
      constructor(callback) {
        this.callback = callback;
        this.observed = new Set();
        observers.push(this);
      }
      observe(element) {
        this.observed.add(element);
      }
      disconnect() {
        this.observed.clear();
      }
    },
  };
  runInNewContext(compiled.outputFiles[0].text, context);
  const Layer = context.module.exports.default;
  return {
    props,
    glyph,
    observers,
    contextRun,
    contextWord,
    listeners,
    frames,
    setInk(next) {
      ink = next;
    },
    render() {
      cursor = 0;
      effects = [];
      tree = Layer(props);
      effects.forEach((effect) => effect());
      return tree;
    },
    nextFrame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
      this.render();
    },
    ring() {
      return tree.props.children.flat().find((node) => node.type === 'ellipse').props;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test('the case ring follows recentered vowel ink after paint even when the row does not resize', () => {
  const ui = layerFixture();
  ui.render();
  ui.nextFrame();
  ui.nextFrame();
  const oldCentre = ui.ring().cx;

  // The longer raʾaytu prefix shifts the centered noun left. New SVG source
  // attributes can commit before that inline position is reflected in its box.
  ui.props.sourceIndex = 14;
  ui.props.measureKey = 'رَأَيْتُ بَيْتَنَا';
  ui.glyph.dataset.sourceIndex = '14';
  ui.render();
  ui.nextFrame();
  assert.equal(ui.ring().cx, oldCentre);

  // The exact shift from the atlas at the 51.2px phone font size: a 564-unit
  // prefix-width increase and a 14-unit difference in the vowel's ink origin.
  const fatha = rect(149 - ((564 / 2 - 14) * 51.2) / 1000, 123.946, 10.401, 6.298);
  ui.setInk(fatha);
  ui.nextFrame();
  const ring = ui.ring();
  assert.ok(ring.cx < oldCentre);
  assert.ok(21 + ring.cx - ring.rx < fatha.left);
  assert.ok(21 + ring.cx + ring.rx > fatha.right);
  assert.ok(80 + ring.cy - ring.ry < fatha.top);
  assert.ok(80 + ring.cy + ring.ry > fatha.bottom);
  assert.equal(ring.rx, 10.2, 'the fix moves the ring without inflating its padding');
  assert.equal(ui.frames.size, 0, 'measurement stops after the bounded follow-up');
  ui.unmount();
});

test('actual word runs trigger layout refresh and cleanup cancels pending measurements', () => {
  const ui = layerFixture();
  ui.render();
  const observer = ui.observers.at(-1);
  assert.ok(observer.observed.has(ui.contextRun));
  assert.ok(observer.observed.has(ui.contextWord));
  ui.nextFrame();
  ui.nextFrame();
  const oldCentre = ui.ring().cx;

  ui.setInk(rect(119, 120, 10.0864, 10.1993));
  observer.callback();
  observer.callback();
  assert.equal(ui.frames.size, 1, 'resize notifications are coalesced');
  ui.nextFrame();
  assert.equal(ui.ring().cx, oldCentre - 30);
  ui.unmount();
  assert.equal(ui.frames.size, 0);
  assert.equal(observer.observed.size, 0);
  assert.equal(ui.listeners.size, 0);
});
