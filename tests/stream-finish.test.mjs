import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

const compiled = await build({
  entryPoints: [new URL('../src/hooks/useStreamSetup.js', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  plugins: [
    {
      name: 'hook-runtime',
      setup(builder) {
        builder.onResolve({ filter: /^react$|^@\/lib\/tvControl$/ }, ({ path }) => ({
          path,
          namespace: 'test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({
          contents:
            path === 'react'
              ? 'export const { useState, useRef, useEffect, useCallback } = globalThis.runtime;'
              : 'export const tvRequest = globalThis.request;',
        }));
        builder.onResolve({ filter: /^@\// }, ({ path }) => ({
          path: new URL(`../src/${path.slice(2)}.js`, import.meta.url).pathname,
        }));
      },
    },
  ],
});
const settings = {
  ...DEFAULT_TV_SETTINGS,
  scene_mode: 'teaching',
  scenes: [
    {
      id: 'lesson',
      name: 'Main lesson',
      overlap: true,
      layers: [
        { id: 'notice', type: 'text', text: 'Welcome', x: 0, y: 0, width: 100, height: 100 },
      ],
    },
  ],
  active_scene_id: 'lesson',
};

function harness({ storage = new Map(), rejectEnd = false, hangSecondRefresh = false } = {}) {
  const cells = [];
  let cursor = 0,
    dirty = true,
    effects = [],
    current;
  const calls = [];
  const runtime = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
      return [
        cells[index],
        (value) => {
          const next = typeof value === 'function' ? value(cells[index]) : value;
          if (!Object.is(next, cells[index])) {
            cells[index] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (cells[index] ||= { current: initial });
    },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!cells[index] || deps.some((item, i) => !Object.is(item, cells[index].deps[i])))
        cells[index] = { fn, deps };
      return cells[index].fn;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = cells[index];
      if (!previous || deps.some((item, i) => !Object.is(item, previous[i]))) {
        cells[index] = deps;
        effects.push(fn);
      }
    },
  };
  const context = {
    runtime,
    module: { exports: {} },
    crypto: webcrypto,
    structuredClone,
    AbortController,
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    setTimeout: () => 1,
    clearTimeout() {},
    window: { confirm: () => true },
    async request(action) {
      calls.push(action);
      if (
        hangSecondRefresh &&
        action === 'admin' &&
        calls.filter((item) => item === 'admin').length > 1
      )
        return new Promise(() => {});
      if (action === 'normal') {
        if (rejectEnd) throw new Error('Could not end stream');
        return {
          settings: { ...settings, scene_mode: 'normal' },
          presentation: null,
          updated_at: 'ended',
        };
      }
      return {
        settings,
        presentation: { id: 'live-stream' },
        updated_at: 'live',
        inputs: [],
        devices: [],
        templates: [],
      };
    },
  };
  runInNewContext(compiled.outputFiles[0].text, context);
  async function flush() {
    for (let i = 0; i < 10; i++) {
      if (dirty) {
        dirty = false;
        cursor = 0;
        current = context.module.exports.default('mens-main', 'operator');
        const pending = effects;
        effects = [];
        for (const effect of pending) effect();
      }
      await Promise.resolve();
    }
    return current;
  }
  return { flush, calls, storage };
}

test('ending returns to normal and retains all settings for the save prompt and refresh', async () => {
  const app = harness();
  let setup = await app.flush();
  setup.manageLive();
  setup = await app.flush();
  const template = { id: 'saved-lesson', name: 'Sunday lesson', updated_at: 'saved' };
  setup.setSavedTemplate(template);
  setup.setStreamName('Saturday Quran lesson');
  setup = await app.flush();
  await setup.run(setup.end);
  setup = await app.flush();
  assert.equal(setup.started, false);
  assert.equal(setup.data.settings.scene_mode, 'normal');
  assert.equal(setup.form, null);
  assert.equal(setup.pendingSave.settings.scenes[0].layers[0].text, 'Welcome');
  assert.equal(setup.pendingSave.template.name, 'Sunday lesson');
  assert.equal(setup.pendingSave.name, 'Saturday Quran lesson');
  assert.equal(app.calls.filter((action) => action === 'save-template').length, 0);
  const restored = harness({ storage: app.storage });
  const reloaded = await restored.flush();
  assert.equal(reloaded.pendingSave.settings.active_scene_id, 'lesson');
  assert.equal(reloaded.pendingSave.name, 'Saturday Quran lesson');
  reloaded.setPendingSave(null);
  await restored.flush();
  assert.equal(app.storage.size, 0);
});

test('setup asks for a stream name and keeps it through refresh without a scene-name prompt', async () => {
  const app = harness();
  let setup = await app.flush();
  setup.build('Stream 1');
  setup = await app.flush();
  assert.equal(setup.form, null);
  assert.match(setup.message, /descriptive/);
  setup.build(' Friday study circle ');
  setup = await app.flush();
  assert.equal(setup.streamName, 'Friday study circle');
  assert.equal(setup.form.scenes.length, 1);
  assert.equal(setup.form.scenes[0].name, 'Main view');
  const refreshed = await harness({ storage: app.storage }).flush();
  assert.equal(refreshed.streamName, 'Friday study circle');
  assert.equal(refreshed.stage, 3);
});

test('a failed end keeps the live setup and does not open the save prompt', async () => {
  const app = harness({ rejectEnd: true });
  let setup = await app.flush();
  setup.manageLive();
  setup = await app.flush();
  await setup.run(setup.end);
  setup = await app.flush();
  assert.equal(setup.started, true);
  assert.equal(setup.form.scenes[0].name, 'Main lesson');
  assert.equal(setup.pendingSave, null);
  assert.match(setup.message, /Could not end stream/);
});

test('a successful update releases the controls without waiting for an extra refresh', async () => {
  const app = harness({ hangSecondRefresh: true });
  let setup = await app.flush();
  setup.manageLive();
  setup = await app.flush();
  let timer;
  const completed = await Promise.race([
    setup.publish().then(() => true),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), 200);
    }),
  ]);
  clearTimeout(timer);
  assert.equal(completed, true);
  setup = await app.flush();
  assert.equal(setup.busy, false);
  assert.equal(setup.started, true);
  await setup.run(setup.end, 'end');
  setup = await app.flush();
  assert.equal(setup.started, false);
  assert.equal(setup.busy, false);
  assert.ok(setup.pendingSave);
});
