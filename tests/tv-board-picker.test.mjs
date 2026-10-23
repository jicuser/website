import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

const bundled = await build({
  entryPoints: [new URL('../src/features/displays/TvBoardPicker.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'board-picker-fixture',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) => {
          if (path.endsWith('.css')) return { path, namespace: 'empty-css' };
          if (path === '@/components/admin/TvPreview') return { path, namespace: 'preview' };
          if (!path.startsWith('@/')) return undefined;
          const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
          return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
        });
        builder.onLoad({ filter: /.*/, namespace: 'preview' }, () => ({
          contents: 'export default function TvPreview() { return null; }',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
      },
    },
  ],
});

function pickerFixture(extra = {}) {
  const slots = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
  };
  const require = createRequire(import.meta.url);
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? hooks : require(name)),
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  const Picker = context.module.exports.default;
  const writes = [];
  const props = {
    screenId: 'mens-main',
    settings: structuredClone(DEFAULT_TV_SETTINGS),
    ...extra,
    onChange(key, value) {
      writes.push({ key, value });
      props.settings = { ...props.settings, [key]: value };
    },
  };
  return {
    props,
    writes,
    render() {
      cursor = 0;
      return Picker(props);
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
  return Array.isArray(tree) ? tree.map(text).join('') : text(tree.props?.children);
}
const button = (tree, label) =>
  nodes(tree).find((node) => node.type === 'button' && text(node) === label);
const choice = (tree, id) => nodes(tree).find((node) => node.type === 'button' && node.key === id);
const previews = (tree) => nodes(tree).filter((node) => node.type?.name === 'TvPreview');

test('an absent everyday override can be restored after a layout is added to the draft', () => {
  const settings = structuredClone(DEFAULT_TV_SETTINGS);
  delete settings.display_layouts.landscape.standby;
  const original = structuredClone(settings.display_layouts);
  const fixture = pickerFixture({ settings });
  choice(fixture.render(), 'countdown').props.onClick();
  button(fixture.render(), 'Use Countdown').props.onClick();
  const restore = button(fixture.render(), 'Restore previous layout');
  assert.ok(restore, 'undo is available when the previous override was absent');
  restore.props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.props.settings.display_layouts)), original);
});

test('layout selection compares against the current draft and never saves automatically', () => {
  const fixture = pickerFixture();
  const original = structuredClone(fixture.props.settings);
  choice(fixture.render(), 'countdown').props.onClick();
  let tree = fixture.render();
  assert.match(text(tree), /Current draft/);
  assert.match(text(tree), /Proposed layout/);
  assert.equal(previews(tree).length, 1);
  assert.equal(
    previews(tree)[0].props.settings.display_layouts.landscape.standby.id,
    'standby-board-countdown-landscape',
  );
  assert.equal(fixture.writes.length, 0);
  const before = nodes(tree).find(
    (node) => node.props?.role === 'tab' && text(node).includes('Current draft'),
  );
  before.props.onClick();
  tree = fixture.render();
  assert.deepEqual(previews(tree)[0].props.settings, original);
  button(tree, 'Close preview').props.onClick();
  assert.equal(previews(fixture.render()).length, 0);
  assert.equal(fixture.writes.length, 0);
});

test('undo restores null, empty and missing layout overrides without manufacturing a scene', () => {
  for (const display_layouts of [
    undefined,
    null,
    {},
    { landscape: undefined },
    { landscape: null },
    { landscape: {} },
    { landscape: { standby: null } },
  ]) {
    const fixture = pickerFixture({
      settings: { ...structuredClone(DEFAULT_TV_SETTINGS), display_layouts },
    });
    const original = structuredClone(display_layouts);
    choice(fixture.render(), 'countdown').props.onClick();
    button(fixture.render(), 'Use Countdown').props.onClick();
    button(fixture.render(), 'Restore previous layout').props.onClick();
    assert.equal(JSON.stringify(fixture.props.settings.display_layouts), JSON.stringify(original));
    assert.equal(
      Object.hasOwn(fixture.props.settings.display_layouts || {}, 'landscape'),
      Object.hasOwn(original || {}, 'landscape'),
    );
  }
});

test('applying each design changes only the current orientation’s everyday draft', () => {
  for (const orientation of ['landscape', 'portrait'])
    for (const [id, name] of [
      ['classic', 'Timetable & notices'],
      ['countdown', 'Countdown'],
      ['noticeboard', 'Noticeboard'],
      ['iftar', 'Iftar sponsorships'],
      ['daily-giving', 'Daily Giving'],
    ]) {
      const settings = {
        ...structuredClone(DEFAULT_TV_SETTINGS),
        display_orientation: orientation,
      };
      const original = structuredClone(settings);
      const fixture = pickerFixture({ settings });
      choice(fixture.render(), id).props.onClick();
      button(fixture.render(), `Use ${name}`).props.onClick();
      assert.equal(fixture.writes.length, 1);
      assert.equal(fixture.writes[0].key, 'display_layouts');
      const updated = JSON.parse(JSON.stringify(fixture.props.settings));
      assert.equal(
        updated.display_layouts[orientation].standby.id,
        `standby-board-${id}-${orientation}`,
      );
      updated.display_layouts[orientation].standby = original.display_layouts[orientation].standby;
      assert.deepEqual(updated, original);
    }
});

test('side-by-side previews keep the same prayer moment and retain it across candidate changes', () => {
  const fixture = pickerFixture();
  choice(fixture.render(), 'countdown').props.onClick();
  button(fixture.render(), 'After-prayer dhikr').props.onClick();
  button(fixture.render(), 'Side by side').props.onClick();
  const pair = previews(fixture.render());
  assert.equal(pair.length, 2);
  assert.deepEqual(
    pair.map((preview) => preview.props.previewState),
    ['dhikr', 'dhikr'],
  );
  assert.equal(pair[0].props.settings, fixture.props.settings);
  assert.equal(
    pair[1].props.settings.display_layouts.landscape.dhikr,
    fixture.props.settings.display_layouts.landscape.dhikr,
  );
  choice(fixture.render(), 'noticeboard').props.onClick();
  assert.equal(previews(fixture.render())[0].props.previewState, 'dhikr');
  assert.equal(fixture.writes.length, 0);
});

test('restoring a layout preserves unrelated draft edits and stops after the layout itself is edited', () => {
  const fixture = pickerFixture();
  const original = structuredClone(fixture.props.settings.display_layouts.landscape.standby);
  choice(fixture.render(), 'countdown').props.onClick();
  button(fixture.render(), 'Use Countdown').props.onClick();
  fixture.props.settings = {
    ...fixture.props.settings,
    show_clock: false,
    display_layouts: {
      ...fixture.props.settings.display_layouts,
      landscape: {
        ...fixture.props.settings.display_layouts.landscape,
        before: {
          ...fixture.props.settings.display_layouts.landscape.before,
          name: 'Edited prayer reminder',
        },
      },
    },
  };
  button(fixture.render(), 'Restore previous layout').props.onClick();
  assert.equal(fixture.props.settings.show_clock, false);
  assert.equal(
    fixture.props.settings.display_layouts.landscape.before.name,
    'Edited prayer reminder',
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(fixture.props.settings.display_layouts.landscape.standby)),
    original,
  );
  choice(fixture.render(), 'countdown').props.onClick();
  button(fixture.render(), 'Use Countdown').props.onClick();
  fixture.props.settings.display_layouts.landscape.standby.name = 'Later custom edit';
  assert.equal(button(fixture.render(), 'Restore previous layout'), undefined);
});

test('screen and orientation changes cannot apply another screen’s candidate or undo', () => {
  for (const changedProps of [
    { screenId: 'shoe-area' },
    { settings: { ...structuredClone(DEFAULT_TV_SETTINGS), display_orientation: 'portrait' } },
  ]) {
    const fixture = pickerFixture();
    choice(fixture.render(), 'countdown').props.onClick();
    Object.assign(fixture.props, changedProps);
    assert.equal(button(fixture.render(), 'Use Countdown'), undefined);
    assert.equal(previews(fixture.render()).length, 0);
  }
  const fixture = pickerFixture();
  choice(fixture.render(), 'countdown').props.onClick();
  button(fixture.render(), 'Use Countdown').props.onClick();
  fixture.props.screenId = 'shoe-area';
  assert.equal(button(fixture.render(), 'Restore previous layout'), undefined);
});

test('disabled settings prevent apply and restore writes', () => {
  const fixture = pickerFixture();
  choice(fixture.render(), 'countdown').props.onClick();
  fixture.props.disabled = true;
  button(fixture.render(), 'Use Countdown').props.onClick();
  assert.equal(fixture.writes.length, 0);
  fixture.props.disabled = false;
  button(fixture.render(), 'Use Countdown').props.onClick();
  fixture.props.disabled = true;
  button(fixture.render(), 'Restore previous layout').props.onClick();
  assert.equal(fixture.writes.length, 1);
});
