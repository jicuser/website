import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateScenes } from '../supabase/functions/_shared/tv-scenes.js';
import {
  DEFAULT_TV_SETTINGS,
  TV_PRESET_KEYS,
  publicSettings,
  secureStreamUrl,
  validateSettings,
  youtubeUrl,
} from '../supabase/functions/_shared/tv.js';

const layer = (type, extra = {}) => ({ id: 'picture', type, x: 0, y: 0, width: 100, height: 100, ...extra });
const scene = (area) => ({ id: 'artwork', name: 'Artwork', overlap: true, layers: [area] });
const validate = (area) => validateScenes([scene(area)], secureStreamUrl, youtubeUrl)[0].layers[0];

test('image crops round-trip for artwork and posters through saved and public display settings', () => {
  const settings = structuredClone(DEFAULT_TV_SETTINGS);
  for (const orientation of ['landscape', 'portrait']) {
    for (const area of settings.display_layouts[orientation].standby.layers) {
      if (['poster', 'poster-next'].includes(area.type)) {
        area.image_fit = 'cover';
        area.image_position = { x: 12.5, y: 83 };
      }
    }
    const artwork = settings.display_layouts[orientation].dhikr.layers.find((area) => area.type === 'state');
    artwork.image_url = 'https://example.org/artwork.png';
    artwork.image_fit = 'cover';
    artwork.image_position = { x: 0, y: 100 };
  }
  const saved = validateSettings(settings);
  for (const visible of [publicSettings(saved, true), publicSettings(saved, false)]) {
    assert.deepEqual(visible.display_layouts, saved.display_layouts);
    for (const orientation of ['landscape', 'portrait']) {
      const artwork = visible.display_layouts[orientation].dhikr.layers.find((area) => area.type === 'state');
      assert.equal(artwork.image_fit, 'cover');
      assert.deepEqual(artwork.image_position, { x: 0, y: 100 });
      for (const poster of visible.display_layouts[orientation].standby.layers.filter((area) => ['poster', 'poster-next'].includes(area.type))) {
        assert.equal(poster.image_fit, 'cover');
        assert.deepEqual(poster.image_position, { x: 12.5, y: 83 });
      }
    }
  }
});

test('crop positions reject malformed values and keep only allowed fields', () => {
  for (const type of ['state', 'poster', 'poster-next']) {
    for (const image_position of [null, [], '50% 50%', {}, { x: 50 }, { x: '50', y: 50 }, { x: -1, y: 50 }, { x: 50, y: 101 }, { x: Infinity, y: 50 }, { x: 50, y: NaN }]) {
      assert.throws(() => validate(layer(type, { image_position })), /crop position/);
    }
    assert.throws(() => validate(layer(type, { image_fit: 'stretch' })), /fit or crop/);
    assert.deepEqual(validate(layer(type, { image_position: { x: 25, y: 75, arbitrary: 'discard' } })).image_position, { x: 25, y: 75 });
    assert.equal(validate(layer(type)).image_position, undefined);
  }
  const nonPicture = validate(layer('text', { text: 'Hello', image_position: { x: 20, y: 70 }, image_fit: 'cover' }));
  assert.equal(nonPicture.image_position, undefined);
  assert.equal(nonPicture.image_fit, undefined);
});

test('staff can remove or hide prayer content while type and bounds validation remain enforced', () => {
  const settings = structuredClone(DEFAULT_TV_SETTINGS);
  for (const preset of TV_PRESET_KEYS.filter((key) => key !== 'standby')) {
    settings.display_layouts.landscape[preset].layers = [];
    settings.display_layouts.portrait[preset].layers.forEach((area) => { area.hidden = true; });
  }
  const saved = validateSettings(settings);
  for (const preset of TV_PRESET_KEYS.filter((key) => key !== 'standby')) {
    assert.deepEqual(saved.display_layouts.landscape[preset].layers, []);
    assert.ok(saved.display_layouts.portrait[preset].layers.every((area) => area.hidden));
  }
  settings.display_layouts.landscape.before.layers = [layer('camera', { url: 'https://example.org/video.m3u8', protocol: 'hls', audio: false })];
  assert.throws(() => validateSettings(settings), /Prayer preset layouts/);
  settings.display_layouts.landscape.before.layers = [layer('text', { text: 'Hello', x: 10 })];
  assert.throws(() => validateSettings(settings), /fit inside the screen/);
});

const bundled = await build({
  entryPoints: [new URL('../src/features/displays/SceneCanvas.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [{
    name: 'image-render-fixture',
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => {
        if (['./PrayerWidget', './PrivateTvPlayer', '@/components/posters/AnnouncementPoster'].includes(path)) return { path, namespace: 'fixture' };
        if (!path.startsWith('@/')) return undefined;
        const base = new URL(`../src/${path.slice(2)}`, import.meta.url).pathname;
        return { path: [base, `${base}.js`, `${base}.jsx`].find(existsSync) };
      });
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default function Stub() { return null; }' }));
    },
  }],
});
const context = { module: { exports: {} }, require: createRequire(import.meta.url) };
runInNewContext(bundled.outputFiles[0].text, context);
const SceneCanvas = context.module.exports.default;
function markup(area, props = {}) {
  return renderToStaticMarkup(React.createElement(SceneCanvas, {
    tv: { settings: { ...DEFAULT_TV_SETTINGS, scenes: [scene(area)], active_scene_id: 'artwork' } },
    now: new Date('2026-10-14T15:00:00Z'),
    posters: [{ id: 'poster-one', image: 'https://example.org/poster.png', title: 'Community class', alt: 'Class poster' }],
    slide: 0,
    onImageError() {},
    ...props,
  }));
}

test('saved artwork and bitmap posters render the same crop in the shared TV canvas', () => {
  for (const type of ['state', 'poster', 'poster-next']) {
    const html = markup(layer(type, { image_url: 'https://example.org/artwork.png', image_fit: 'cover', image_position: { x: 17, y: 89 } }));
    assert.match(html, /object-fit:cover;object-position:17% 89%/);
    assert.match(markup(layer(type, { image_url: 'https://example.org/artwork.png' })), /object-fit:contain;object-position:50% 50%/);
  }
});

test('deleting a logo stays deleted in automatic layouts and legacy presentation fallback remains available', () => {
  const clock = layer('clock');
  assert.doesNotMatch(markup(clock, { showFallbackBrand: false }), /jic-pillars-dark/);
  assert.match(markup(clock), /jic-pillars-dark/);
  assert.doesNotMatch(markup(layer('brand', { hidden: true })), /jic-pillars-dark/);
});
