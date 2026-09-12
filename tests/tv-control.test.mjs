import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TV_SCREENS,
  DEFAULT_TV_SETTINGS,
  validateSettings,
  publicSettings,
  validDescription,
  secureStreamUrl,
  youtubeUrl,
} from '../supabase/functions/_shared/tv.js';
import {
  newScene,
  fitRect,
  canPlace,
  usedInputSlots,
} from '../supabase/functions/_shared/tv-scenes.js';
const layer = (type, props = {}) => ({
  id: 'source',
  type,
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  ...props,
});
const config = (layers, extra = {}) => ({
  ...DEFAULT_TV_SETTINGS,
  scenes: [{ id: 'scene-1', name: 'Scene 1', overlap: true, layers }],
  ...extra,
});
test('four stable halls and two display modes', () => {
  assert.deepEqual(
    TV_SCREENS.map((s) => s.id),
    ['mens-main', 'mens-upstairs', 'ladies-upstairs', 'shoe-area'],
  );
  assert.deepEqual(validateSettings(DEFAULT_TV_SETTINGS), DEFAULT_TV_SETTINGS);
  for (const mode of ['speech', 'class', 'ramadan', 'html'])
    assert.throws(() => validateSettings({ scene_mode: mode }));
  assert.equal(validateSettings({ scene_mode: 'teaching' }, 'shoe-area').scene_mode, 'normal');
});
test('scenes preserve layers, geometry, stacking and independent device inputs', () => {
  const s = validateSettings(
    config(
      [
        layer('input', { slot: 'input-1', audio: true }),
        layer('input', { id: 'phone', slot: 'input-2', audio: false, x: 50 }),
        layer('clock', { id: 'clock', x: 80, width: 20, height: 10 }),
      ],
      { scene_mode: 'teaching' },
    ),
  );
  assert.deepEqual(
    s.scenes[0].layers.map((l) => l.id),
    ['source', 'phone', 'clock'],
  );
  assert.equal(s.scenes[0].layers[0].audio, true);
  assert.deepEqual([...usedInputSlots(s)], ['input-1', 'input-2']);
  const two = {
    ...s,
    scenes: [...s.scenes, newScene('scene-2', 'Scene 2')],
    active_scene_id: 'scene-2',
  };
  assert.equal(validateSettings(two).active_scene_id, 'scene-2');
});
test('invalid layout, duplicate inputs and oversized scenes fail at the API boundary', () => {
  for (const bad of [
    layer('html'),
    layer('poster', { x: -1 }),
    layer('poster', { x: 90, width: 50 }),
    layer('poster', { height: 0 }),
    layer('poster', { width: NaN }),
    layer('input', { slot: 'other', audio: false }),
    layer('camera', { url: 'http://192.168.1.1', protocol: 'hls', audio: false }),
    layer('youtube', { url: 'https://evil.example', audio: true }),
    layer('text', { text: 'a'.repeat(1201) }),
  ])
    assert.throws(() => validateSettings(config([bad])));
  assert.throws(() =>
    validateSettings(
      config([
        layer('input', { slot: 'input-1', audio: false }),
        layer('input', { id: 'second', slot: 'input-1', audio: false }),
      ]),
    ),
  );
  assert.throws(() =>
    validateSettings(
      config(Array.from({ length: 13 }, (_, i) => layer('poster', { id: `p${i}` }))),
    ),
  );
  assert.throws(() => validateSettings({ ...DEFAULT_TV_SETTINGS, scenes: [] }));
  assert.throws(() =>
    validateSettings({
      ...DEFAULT_TV_SETTINGS,
      scenes: Array.from({ length: 7 }, (_, i) => newScene(`s${i}`)),
    }),
  );
  assert.throws(() => validateSettings({ ...DEFAULT_TV_SETTINGS, active_scene_id: 'missing' }));
});
test('overlap switch enforces layout both while dragging and saving', () => {
  const first = layer('poster');
  const second = layer('poster-next', { id: 'p2', x: 50 });
  const scene = { id: 'scene-1', name: 'Test', overlap: false, layers: [first, second] };
  assert.equal(canPlace(scene, { ...second, x: 25 }), false);
  assert.equal(canPlace(scene, { ...second, x: 50 }), true);
  assert.deepEqual(fitRect({ x: -20, y: 100, width: 30, height: 40 }), {
    x: 0,
    y: 60,
    width: 30,
    height: 40,
  });
  assert.doesNotThrow(() => validateSettings({ ...DEFAULT_TV_SETTINGS, scenes: [scene] }));
  assert.throws(() =>
    validateSettings({
      ...DEFAULT_TV_SETTINGS,
      scenes: [{ ...scene, layers: [first, { ...second, x: 25 }] }],
    }),
  );
});
test('private class sources and extra fields never appear in public screen settings', () => {
  const s = config(
    [
      layer('camera', { url: 'https://camera.local/private', protocol: 'hls', audio: true }),
      layer('text', { id: 'text', text: 'Private lesson' }),
    ],
    { deviceToken: 'secret', stream_key: 'secret' },
  );
  const pub = JSON.stringify(publicSettings(s));
  assert.equal(pub.includes('private'), false);
  assert.equal(pub.includes('Private lesson'), false);
  assert.equal(pub.includes('secret'), false);
  const paired = publicSettings(s, true);
  assert.equal(paired.scenes[0].layers[0].url, 'https://camera.local/private');
  assert.equal('stream_key' in paired, false);
});
test('unsafe URLs, malformed SDP and invalid normal options are rejected', () => {
  for (const url of [
    'http://camera.local',
    'rtsp://camera.local',
    'javascript:alert(1)',
    'https://a:b@camera.local/',
    'https://camera.local/#x',
  ])
    assert.throws(() => secureStreamUrl(url));
  assert.equal(youtubeUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://youtu.be/dQw4w9WgXcQ');
  assert.equal(validDescription({ type: 'offer', sdp: 'v=0\r\n' }, 'offer'), true);
  for (const d of [
    null,
    { type: 'answer', sdp: 'v=0' },
    { type: 'offer', sdp: 'bad' },
    { type: 'offer', sdp: 'v=0' + 'a'.repeat(65536) },
  ])
    assert.equal(validDescription(d, 'offer'), false);
  for (const options of [
    { rotation_seconds: 4 },
    { rotation_seconds: 301 },
    { poster_ids: ['x'] },
    { poster_ids: [], include_events: false },
    { show_clock: 'no' },
    { calendar_offset: 3 },
    { ramadan_calendar: 'bad' },
  ])
    assert.throws(() => validateSettings(options));
});
