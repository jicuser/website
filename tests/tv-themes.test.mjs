import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DEFAULT_TV_SETTINGS,
  normaliseTvSettings,
  publicSettings,
  validateSettings,
} from '../supabase/functions/_shared/tv.js';
import {
  TV_THEMES,
  TV_THEME_KEYS,
  tvThemeId,
  tvThemeStyle,
} from '../supabase/functions/_shared/tv-themes.js';

test('old settings retain the Midnight default and invalid stored themes render safely', () => {
  assert.equal(DEFAULT_TV_SETTINGS.display_theme, 'midnight');
  for (const settings of [{}, { display_theme: null }, { display_theme: 'unknown' }]) {
    assert.equal(normaliseTvSettings(settings).display_theme, 'midnight');
    assert.equal(publicSettings(settings).display_theme, 'midnight');
  }
  assert.equal(validateSettings({}).display_theme, 'midnight');
});

test('each colour scheme survives save, paired display and public preview settings', () => {
  for (const display_theme of TV_THEME_KEYS) {
    const saved = validateSettings({ display_theme });
    assert.equal(saved.display_theme, display_theme);
    assert.equal(publicSettings(saved, true).display_theme, display_theme);
    assert.equal(publicSettings(saved, false).display_theme, display_theme);
    assert.deepEqual(publicSettings(saved, false).display_layouts, saved.display_layouts);
  }
});

test('the settings API rejects arbitrary CSS, objects and unknown theme identifiers', () => {
  for (const display_theme of [
    '',
    null,
    {},
    [],
    0,
    'Pearl',
    '__proto__',
    'url(https://example.test)',
    'midnight; color:red',
  ]) {
    assert.throws(() => validateSettings({ display_theme }), /TV colour scheme/);
    assert.equal(tvThemeId(display_theme), 'midnight');
    assert.deepEqual(tvThemeStyle(display_theme), tvThemeStyle('midnight'));
  }
});

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => {
      const n = parseInt(value, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const contrast = (a, b) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('TV text, muted labels and gold accents meet AA across their opaque surfaces', () => {
  assert.deepEqual(
    TV_THEMES.map(({ id }) => id),
    TV_THEME_KEYS,
  );
  for (const { id, colors } of TV_THEMES) {
    for (const value of Object.values(colors)) assert.match(value, /^#[0-9a-f]{6}$/);
    for (const foreground of ['text', 'muted', 'accent']) {
      for (const background of ['background', 'surface', 'raised', 'highlight']) {
        assert.ok(
          contrast(colors[foreground], colors[background]) >= 4.5,
          `${id}: ${foreground} on ${background}`,
        );
      }
    }
    assert.ok(contrast(colors.highlightText, colors.highlight) >= 4.5);
  }
});

const bundled = await build({
  stdin: {
    contents:
      "export { default as SceneCanvas } from './src/features/displays/SceneCanvas.jsx'; export { default as TvThemePicker } from './src/features/displays/TvThemePicker.jsx';",
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  alias: { '@': new URL('../src', import.meta.url).pathname },
  loader: { '.css': 'empty' },
  write: false,
  plugins: [
    {
      name: 'theme-display-fixture',
      setup(builder) {
        builder.onResolve({ filter: /PrivateTvPlayer|AnnouncementPoster/ }, ({ path }) => ({
          path,
          namespace: 'fixture',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: 'export default function Stub() { return null; }',
        }));
      },
    },
  ],
});
const context = { module: { exports: {} }, require: createRequire(import.meta.url) };
runInNewContext(bundled.outputFiles[0].text, context);
const { SceneCanvas, TvThemePicker } = context.module.exports;

test('the shared editor/live canvas carries the chosen colours and correct logo without tinting artwork', () => {
  for (const display_theme of TV_THEME_KEYS) {
    const scene = {
      id: 'theme-fixture',
      name: 'TV theme fixture',
      layers: [
        { id: 'times', type: 'times', x: 0, y: 0, width: 100, height: 25 },
        { id: 'brand', type: 'brand', x: 0, y: 25, width: 20, height: 25 },
        { id: 'poster', type: 'poster', x: 20, y: 25, width: 80, height: 75 },
      ],
    };
    const markup = renderToStaticMarkup(
      React.createElement(SceneCanvas, {
        tv: {
          settings: {
            ...DEFAULT_TV_SETTINGS,
            display_theme,
            scenes: [scene],
            active_scene_id: scene.id,
          },
        },
        now: new Date('2026-10-18T10:00:00Z'),
        prayers: { todaysTimes: {}, jummahTimes: [] },
        posters: [
          {
            id: 'fixture-poster',
            image: 'https://example.test/poster.png',
            alt: 'Original poster',
            title: 'Poster',
          },
        ],
        slide: 0,
        onImageError() {},
      }),
    );
    assert.match(markup, new RegExp(`data-tv-theme="${display_theme}"`));
    assert.ok(markup.includes(`--jic-text:${tvThemeStyle(display_theme)['--jic-text']}`));
    assert.match(
      markup,
      new RegExp(`jic-pillars-${display_theme === 'pearl' ? 'light' : 'dark'}\\.svg`),
    );
    assert.match(markup, /src="https:\/\/example.test\/poster.png"/);
    assert.doesNotMatch(markup, /filter:|mix-blend-mode:/);
  }
});

test('the colour picker identifies the draft selection and respects disabled saving controls', () => {
  const markup = renderToStaticMarkup(
    React.createElement(TvThemePicker, {
      settings: { display_theme: 'forest' },
      disabled: true,
      onChange() {},
    }),
  );
  assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((markup.match(/disabled=""/g) || []).length, 3);
  for (const name of ['Midnight', 'Pearl', 'Forest']) assert.ok(markup.includes(name));
  assert.match(markup, /Posters keep their own colours/);
});
