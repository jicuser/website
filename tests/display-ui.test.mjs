import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

async function component(path) {
  const result = await build({
    entryPoints: [new URL(`../src/${path}`, import.meta.url).pathname],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    plugins: [
      {
        name: 'project-alias',
        setup(builder) {
          builder.onResolve({ filter: /^@\// }, ({ path }) => {
            const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
            return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
          });
        },
      },
    ],
  });
  const context = { module: { exports: {} }, require: createRequire(import.meta.url) };
  runInNewContext(result.outputFiles[0].text, context);
  return context.module.exports;
}
const { default: InputDialog } = await component('features/displays/ContentEditorDialog.jsx');
const { default: SettingsLibrary } = await component('features/displays/StreamSettingsLibrary.jsx');
const { default: PrayerTimeBar, NextPrayerSummary } = await component(
  'components/shell/PrayerTimeBar.jsx',
);
const noop = () => {};
const input = {
  id: 'laptop',
  type: 'input',
  capture: 'screen',
  slot: 'input-1',
  name: 'Classroom laptop',
  audio: false,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};
function inputMarkup(area, extraProps = {}) {
  const scene = { id: 'lesson', name: 'Main lesson', overlap: true, layers: [area] };
  return renderToStaticMarkup(
    React.createElement(InputDialog, {
      area,
      scene,
      value: { ...DEFAULT_TV_SETTINGS, scenes: [scene], active_scene_id: scene.id },
      onChange: noop,
      onClose: noop,
      posters: [],
      renderDeviceInput: () => React.createElement('button', null, 'Connect classroom laptop'),
      ...extraProps,
    }),
  );
}

test('reopening a configured device shows its settings before connection controls', () => {
  const markup = inputMarkup(input);
  assert.match(markup, /Device name \(required\)/);
  assert.match(markup, /value="Classroom laptop"/);
  assert.match(markup, /Continue to connection/);
  assert.match(markup, /Position and size/);
  assert.doesNotMatch(markup, /scene-content-types|Connect classroom laptop/);
});

test('empty and selected inputs use one type dropdown with only relevant settings', () => {
  const empty = inputMarkup({ ...input, type: 'empty' });
  assert.match(empty, /<select/);
  assert.match(empty, /<option value="empty" disabled="" selected="">Select input type/);
  assert.doesNotMatch(
    empty,
    /scene-content-types|Connect classroom laptop|Device name \(required\)/,
  );
  const link = inputMarkup({
    ...input,
    type: 'youtube',
    url: 'https:\/\/www.youtube.com/watch?v=abc',
  });
  assert.doesNotMatch(
    link,
    /scene-content-types|Connect classroom laptop|Device name \(required\)/,
  );
  assert.match(link, /type="url"/);
  assert.match(link, /<select/);
  assert.match(link, /Apply input/);
});

test('legacy generic device names return to the name form instead of starting a connection', () => {
  const markup = inputMarkup({ ...input, name: 'Device 1' }, { showConnection: true });
  assert.match(markup, /Device name \(required\)/);
  assert.doesNotMatch(markup, /Connect classroom laptop/);
});

test('the direct connection action opens controls without repeating the input form', () => {
  const markup = inputMarkup(input, { showConnection: true });
  assert.match(markup, /Connect classroom laptop/);
  assert.match(markup, /Change input settings/);
  assert.doesNotMatch(markup, /Device name \(required\)|Continue to connection/);
});

test('saved settings are offered for loading without asking to save before ending', () => {
  const markup = renderToStaticMarkup(
    React.createElement(SettingsLibrary, {
      value: DEFAULT_TV_SETTINGS,
      onChange: noop,
      templates: [{ id: 'saved', name: 'Sunday lesson', settings: { scenes: [] } }],
    }),
  );
  assert.match(markup, /Load settings/);
  assert.doesNotMatch(markup, /Save stream settings|Update saved settings|Save scene/);
});

test('the display header can show all six prayers without next-prayer details, which render separately', () => {
  const props = {
    todaysTimes: {
      fajr: '05:00',
      sunrise: '06:30',
      dhuhr: '13:00',
      asr: '17:00',
      maghrib: '19:30',
      isha: '21:00',
    },
    jummahTimes: [],
    currentDate: new Date('2026-09-12T13:30:00Z'),
    interactive: false,
    showContact: false,
    showNext: false,
  };
  const header = renderToStaticMarkup(React.createElement(PrayerTimeBar, props));
  for (const name of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'])
    assert.match(header, new RegExp(name));
  assert.doesNotMatch(header, /Next:|until .* starts/);
  const footer = renderToStaticMarkup(React.createElement(NextPrayerSummary, props));
  assert.match(footer, /Next:.*Asr/);
  assert.match(footer, /until Asr starts/);
  const website = renderToStaticMarkup(
    React.createElement(PrayerTimeBar, { ...props, showNext: true }),
  );
  assert.match(website, /Next:.*Asr/);
});
