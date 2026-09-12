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
function inputMarkup(area) {
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
    }),
  );
}

test('reopening a configured device shows connection controls and a settings cog without the setup form', () => {
  const markup = inputMarkup(input);
  assert.match(markup, /Connect classroom laptop/);
  assert.match(markup, /aria-label="Change input settings"/);
  assert.doesNotMatch(
    markup,
    /scene-content-types|Device name \(required\)|Continue to connection/,
  );
});

test('empty inputs show the chooser; selected links show only the relevant form and type dropdown', () => {
  assert.match(inputMarkup({ ...input, type: 'empty' }), /scene-content-types/);
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
  const markup = inputMarkup({ ...input, name: 'Device 1' });
  assert.match(markup, /Device name \(required\)/);
  assert.doesNotMatch(markup, /Connect classroom laptop/);
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
