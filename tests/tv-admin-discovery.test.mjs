import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import React from 'react';
import { TV_SCREENS, DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

const mocks = [
  '@/lib/tvControl',
  '@/lib/tvAutomaticState',
  '@/components/sections/prayer-times/PrayerTimesLogic',
];
const bundles = Object.fromEntries(
  await Promise.all(
    ['TvScreenList', 'TvConnections'].map(async (name) => {
      const result = await build({
        entryPoints: [new URL(`../src/features/displays/${name}.jsx`, import.meta.url).pathname],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        packages: 'external',
        write: false,
        plugins: [
          {
            name: 'tv-admin-fixture',
            setup(builder) {
              builder.onResolve({ filter: /^@\// }, ({ path }) => {
                if (mocks.includes(path)) return { path, external: true };
                const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
                return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
              });
            },
          },
        ],
      });
      return [name, result.outputFiles[0].text];
    }),
  ),
);

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree) return '';
  return Array.isArray(tree) ? tree.map(text).join('') : text(tree.props?.children);
}

// Render the actual controls and exercise their callbacks, without a browser or live backend.
function fixture(name, request, props = {}) {
  const slots = [];
  let cursor = 0,
    dirty = false,
    effects = [],
    tree;
  const runtime = {
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
      return (slots[index] ||= { current: initial });
    },
    useId() {
      return `tv-field-${cursor++}`;
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
        slots[index] = { callback, deps };
      }
      return slots[index].callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        slots[index] = { deps };
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
    AbortController,
    window: {
      setInterval: () => 1,
      clearInterval() {},
      location: { origin: 'https://example.test' },
    },
    require: (path) => {
      if (path === 'react') return runtime;
      if (path === '@/lib/tvControl') return { TV_SCREENS, tvRequest: request };
      if (path === '@/lib/tvAutomaticState')
        return { tvAutomaticState: () => ({ preset: 'standby' }) };
      if (path === '@/components/sections/prayer-times/PrayerTimesLogic')
        return { usePrayerTimes: () => ({}) };
      return require(path);
    },
  };
  runInNewContext(bundles[name], context);
  const Component = context.module.exports.default;
  const render = () => {
    let passes = 0;
    do {
      dirty = false;
      cursor = 0;
      effects = [];
      tree = Component(props);
      effects.forEach((effect) => effect());
      assert.ok(++passes < 10, 'component state settles');
    } while (dirty);
    return tree;
  };
  return {
    render,
    get tree() {
      return tree;
    },
    find(predicate) {
      return nodes(tree).find(predicate);
    },
    all(predicate) {
      return nodes(tree).filter(predicate);
    },
    button(label) {
      return nodes(tree).find(
        (node) =>
          node.type === 'button' && (node.props['aria-label'] === label || text(node) === label),
      );
    },
    async settle() {
      await new Promise((resolve) => setImmediate(resolve));
      return render();
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

function screenFixture() {
  const requests = [],
    opened = [];
  const view = fixture(
    'TvScreenList',
    (action, screenId, values, options) =>
      new Promise((resolve, reject) => {
        requests.push({ action, screenId, values, options, resolve, reject });
      }),
    { onOpen: (screenId) => opened.push(screenId) },
  );
  view.render();
  return { ...view, view, requests, opened };
}
const saved = (presentation = null) => ({
  settings: structuredClone(DEFAULT_TV_SETTINGS),
  presentation,
});
const cards = (view) =>
  view.all((node) => node.type === 'article' && node.props.className === 'tv-screen-overview-card');
const filter = (view, id) =>
  view.find((node) => node.type === 'button' && node.key === id && 'aria-pressed' in node.props);
const catalogue = (view) =>
  view.find((node) => node.props?.['aria-label'] === 'All TV screen controls');

test('All opens every permanent screen, including the main hall, before status checks finish', (t) => {
  const { view, requests, opened } = screenFixture();
  t.after(() => view.unmount());
  assert.deepEqual(
    cards(view).map((node) => node.key),
    ['mens-main', 'mens-upstairs', 'ladies-upstairs', 'shoe-area'],
  );
  for (const screen of TV_SCREENS) view.button(`Open ${screen.label} display`).props.onClick();
  assert.deepEqual(
    opened,
    TV_SCREENS.map((screen) => screen.id),
  );
  assert.ok(requests.every(({ action, options }) => action === 'admin' && options.staff));
  assert.equal(text(filter(view, 'all')), 'All 4');
});

test('one slow hall check does not delay another hall’s saved preview or status', async (t) => {
  const { view, requests } = screenFixture();
  t.after(() => view.unmount());
  requests.find((entry) => entry.screenId === 'mens-main').resolve(saved());
  await view.settle();
  assert.match(text(cards(view).find((node) => node.key === 'mens-main')), /Automatic display/);
  assert.match(text(cards(view).find((node) => node.key === 'mens-upstairs')), /Checking…/);
  assert.equal(cards(view).length, 4);
});

test('failed checks never remove a screen from All or the filtered control catalogue', async (t) => {
  const { view, requests, opened } = screenFixture();
  t.after(() => view.unmount());
  for (const request of requests) request.reject(new Error('Connection unavailable'));
  await view.settle();
  assert.equal(cards(view).length, 4);
  assert.ok(cards(view).every((node) => /Status unavailable/.test(text(node))));
  for (const id of ['automatic', 'live']) {
    filter(view, id).props.onClick();
    view.render();
    assert.equal(cards(view).length, 0);
    assert.equal(nodes(catalogue(view)).filter((node) => node.type === 'button').length, 4);
    view.button('Open controls for Men’s Main Hall').props.onClick();
    assert.match(text(view.tree), /Every screen can still be opened/);
  }
  assert.deepEqual(opened, ['mens-main', 'mens-main']);
  view.button('Show all screens').props.onClick();
  view.render();
  assert.equal(cards(view).length, 4);
  assert.equal(filter(view, 'all').props['aria-pressed'], true);
});

test('Live filters previews without losing the automatic main hall’s controls', async (t) => {
  const { view, requests, opened } = screenFixture();
  t.after(() => view.unmount());
  for (const request of requests)
    request.resolve(saved(request.screenId === 'mens-upstairs' ? { id: 'live' } : null));
  await view.settle();
  filter(view, 'live').props.onClick();
  view.render();
  assert.deepEqual(
    cards(view).map((node) => node.key),
    ['mens-upstairs'],
  );
  view.button('Open controls for Men’s Main Hall').props.onClick();
  assert.deepEqual(opened, ['mens-main']);
  assert.equal(text(filter(view, 'automatic')), 'Automatic 3');
  assert.equal(text(filter(view, 'live')), 'Live 1');
});

test('refresh retries every hall and restores a failed main hall without changing its ID', async (t) => {
  const { view, requests } = screenFixture();
  t.after(() => view.unmount());
  for (const request of requests) request.reject(new Error('Connection unavailable'));
  await view.settle();
  view.button('Refresh').props.onClick();
  view.render();
  assert.equal(requests.length, 8);
  for (const request of requests.slice(4)) request.resolve(saved());
  await view.settle();
  assert.equal(cards(view).length, 4);
  assert.match(text(cards(view)[0]), /Men’s Main Hall.*Automatic display/);
  assert.ok(requests.every(({ action }) => action === 'admin'));
});

test('an aborted picker cannot replace status after it has closed', async () => {
  const { view, requests } = screenFixture();
  view.unmount();
  assert.ok(requests.every(({ options }) => options.signal.aborted));
  for (const request of requests) request.resolve(saved());
  await view.settle();
  assert.ok(cards(view).every((node) => /Checking…/.test(text(node))));
});

test('connecting an existing display allows an optional name and uses the selected hall', async () => {
  const calls = [],
    operations = [];
  const view = fixture(
    'TvConnections',
    async (...args) => {
      calls.push(args);
      return { name: 'Display' };
    },
    {
      screenId: 'mens-main',
      data: { presentation: { id: 'session', code: 'secret' }, devices: [] },
      onRefresh: async () => {},
      run: (operation) => operations.push(operation()),
      busy: false,
    },
  );
  view.render();
  assert.match(text(view.tree), /Display name \(optional\)/);
  view
    .find((node) => node.type === 'input' && node.props.inputMode === 'numeric')
    .props.onChange({ target: { value: '123456' } });
  view.render();
  view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await Promise.all(operations);
  await view.settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'approve-display');
  assert.equal(calls[0][1], 'mens-main');
  assert.equal(calls[0][2].code, '123456');
  assert.equal(calls[0][2].name, undefined);
});

test('optional display names still reject a supplied generic name before connection', () => {
  const calls = [];
  const view = fixture(
    'TvConnections',
    async (...args) => {
      calls.push(args);
    },
    {
      screenId: 'mens-main',
      data: { presentation: { id: 'session', code: 'secret' }, devices: [] },
      onRefresh: async () => {},
      run: (operation) => operation(),
      busy: false,
    },
  );
  view.render();
  view
    .find((node) => node.type === 'input' && node.props.inputMode === 'numeric')
    .props.onChange({ target: { value: '123456' } });
  view
    .find((node) => node.type === 'input' && node.props.placeholder === 'e.g. Main hall projector')
    .props.onChange({ target: { value: 'Device 1' } });
  view.render();
  view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(calls.length, 0);
  assert.ok(view.find((node) => node.props?.role === 'alert'));
});
