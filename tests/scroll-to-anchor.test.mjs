import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollToAnchor } from '../src/lib/scrollToAnchor.js';

function environment(t) {
  const previous = Object.fromEntries(
    ['window', 'document', 'MutationObserver'].map((key) => [key, globalThis[key]]),
  );
  const frames = new Map(),
    timers = new Map(),
    targets = new Map();
  let serial = 0,
    observer;
  globalThis.window = {
    requestAnimationFrame: (callback) => {
      frames.set(++serial, callback);
      return serial;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    setTimeout: (callback) => {
      timers.set(++serial, callback);
      return serial;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  globalThis.document = { body: {}, getElementById: (id) => targets.get(id) };
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      observer = this;
    }
    observe() {
      this.active = true;
    }
    disconnect() {
      this.active = false;
    }
  };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  return {
    targets,
    frames,
    timers,
    change: () => observer?.active && observer.callback(),
    watching: () => Boolean(observer?.active),
    paint: () => {
      for (const callback of frames.values()) callback();
      frames.clear();
    },
  };
}

function target() {
  const actions = [];
  return {
    actions,
    scrollIntoView: (options) => actions.push(['scroll', options]),
    focus: (options) => actions.push(['focus', options]),
  };
}

test('an anchor arriving with a slow timetable is scrolled to once, then observation stops', (t) => {
  const env = environment(t);
  const stop = scrollToAnchor('#phone-wallpaper');
  assert.equal(env.watching(), true);
  const node = target();
  env.targets.set('phone-wallpaper', node);
  env.change();
  env.change();
  env.paint();
  assert.deepEqual(node.actions, [
    ['scroll', { block: 'start' }],
    ['focus', { preventScroll: true }],
  ]);
  assert.equal(env.watching(), false);
  assert.equal(env.timers.size, 0);
  stop();
});

test('navigating away cancels pending anchor observation and scheduled scrolling', (t) => {
  const env = environment(t);
  const stop = scrollToAnchor('#phone-wallpaper');
  stop();
  assert.equal(env.watching(), false);
  const node = target();
  env.targets.set('phone-wallpaper', node);
  env.change();
  env.paint();
  assert.equal(node.actions.length, 0);
  const cancelPaint = scrollToAnchor('#phone-wallpaper');
  cancelPaint();
  env.paint();
  assert.equal(node.actions.length, 0);
});

test('missing anchors stop waiting and malformed fragments do not throw', (t) => {
  const env = environment(t);
  const stop = scrollToAnchor('#%');
  for (const callback of env.timers.values()) callback();
  assert.equal(env.watching(), false);
  stop();
  const node = target();
  env.targets.set('phone wallpaper', node);
  scrollToAnchor('#phone%20wallpaper');
  env.paint();
  assert.equal(node.actions.length, 2);
});
