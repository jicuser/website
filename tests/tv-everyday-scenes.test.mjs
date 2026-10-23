import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TV_SETTINGS,
  normaliseTvSettings,
  publicSettings,
  validateSettings,
  tvAutomaticScene,
} from '../supabase/functions/_shared/tv.js';
import { overlaps } from '../supabase/functions/_shared/tv-scenes.js';

const at = (seconds) => new Date(seconds * 1000);
const rotation = () => ({
  mode: 'rotation',
  fixed_scene: 'classic',
  rotation: [
    { kind: 'classic', duration_seconds: 10 },
    { kind: 'iftar', duration_seconds: 20 },
    { kind: 'suhoor', duration_seconds: 30 },
    { kind: 'daily-giving', duration_seconds: 40 },
  ],
  persistent_layer_ids: { landscape: [], portrait: [] },
});

test('legacy settings keep their exact everyday layout and gain an independent fixed default', () => {
  const legacy = structuredClone(DEFAULT_TV_SETTINGS);
  delete legacy.everyday_display;
  legacy.display_layouts.landscape.standby.name = 'Our saved layout';
  const baseline = structuredClone(legacy);
  const saved = validateSettings(legacy);
  assert.equal(saved.everyday_display.mode, 'fixed');
  assert.equal(saved.everyday_display.fixed_scene, 'classic');
  assert.deepEqual(tvAutomaticScene(saved, at(15)).scene, legacy.display_layouts.landscape.standby);
  assert.equal(tvAutomaticScene(saved, at(15)).name, 'Our saved layout');
  assert.deepEqual(legacy, baseline);
  const normalised = normaliseTvSettings(legacy);
  normalised.everyday_display.rotation[0].duration_seconds = 99;
  assert.notEqual(normaliseTvSettings(legacy).everyday_display.rotation[0].duration_seconds, 99);
});

test('scene rotation changes exactly at each duration boundary and stays in sync after reload', () => {
  const saved = validateSettings({ everyday_display: rotation() });
  for (const [seconds, kind, remaining] of [
    [0, 'classic', 10],
    [9.999, 'classic', 1],
    [10, 'iftar', 20],
    [29.999, 'iftar', 1],
    [30, 'suhoor', 30],
    [60, 'daily-giving', 40],
    [100, 'classic', 10],
    [210, 'iftar', 20],
  ]) {
    const current = tvAutomaticScene(saved, at(seconds));
    assert.equal(current.kind, kind, `${seconds}s`);
    assert.equal(current.remaining_seconds, remaining);
    assert.deepEqual(tvAutomaticScene(structuredClone(saved), at(seconds)), current);
  }
});

test('each Ramadan board works as a fixed scene in both orientations and is public content', () => {
  for (const orientation of ['landscape', 'portrait'])
    for (const [kind, boardKind] of [
      ['iftar', 'iftar'],
      ['suhoor', 'suhoor'],
      ['daily-giving', 'daily'],
    ]) {
      const saved = validateSettings({
        display_orientation: orientation,
        everyday_display: { ...rotation(), mode: 'fixed', fixed_scene: kind },
      });
      const scene = tvAutomaticScene(publicSettings(saved), at(0)).scene;
      assert.equal(scene.layers.find((layer) => layer.type === 'ramadan').ramadan_kind, boardKind);
      assert.equal(tvAutomaticScene(saved, at(900)).kind, kind);
      assert.equal(tvAutomaticScene(saved, at(900)).remaining_seconds, null);
    }
});

test('fixed timetable and footer items retain their coordinates across changing scenes', () => {
  const input = structuredClone(DEFAULT_TV_SETTINGS);
  input.everyday_display = rotation();
  const base = input.display_layouts.landscape.standby;
  const persistent = base.layers.filter((layer) =>
    ['times', 'brand', 'clock'].includes(layer.type),
  );
  input.everyday_display.persistent_layer_ids.landscape = persistent.map((layer) => layer.id);
  const saved = validateSettings(input);
  const baseline = structuredClone(saved);
  for (const seconds of [10, 30, 60]) {
    const scene = tvAutomaticScene(saved, at(seconds)).scene;
    for (const layer of persistent)
      assert.deepEqual(
        scene.layers.find((item) => item.id === layer.id),
        layer,
      );
    const changing = scene.layers.find((layer) => layer.type === 'ramadan');
    assert.ok(persistent.every((fixed) => !overlaps(changing, fixed)));
    assert.equal(changing.y, 22);
    assert.equal(changing.height, 68);
  }
  assert.deepEqual(tvAutomaticScene(saved, at(0)).scene, base);
  assert.deepEqual(saved, baseline);
  assert.equal(tvAutomaticScene(saved, at(10), { orientation: 'portrait' }).scene.layers.length, 3);
});

test('a fixed side timetable and header reserve a clear board area without duplicate layer IDs', () => {
  const input = structuredClone(DEFAULT_TV_SETTINGS);
  input.everyday_display = { ...rotation(), mode: 'fixed', fixed_scene: 'iftar' };
  input.display_layouts.landscape.standby.layers = [
    {
      id: 'everyday-ramadan',
      type: 'times',
      x: 0,
      y: 10,
      width: 30,
      height: 90,
      layout: 'vertical',
    },
    { id: 'header', type: 'clock', x: 0, y: 0, width: 100, height: 10 },
  ];
  input.everyday_display.persistent_layer_ids.landscape = ['everyday-ramadan', 'header'];
  const scene = tvAutomaticScene(validateSettings(input), at(0)).scene;
  assert.equal(new Set(scene.layers.map((layer) => layer.id)).size, scene.layers.length);
  const board = scene.layers.find((layer) => layer.type === 'ramadan');
  assert.deepEqual(
    { x: board.x, y: board.y, width: board.width, height: board.height },
    { x: 30, y: 10, width: 70, height: 85 },
  );
});

test('public programme settings contain only the supported scene fields', () => {
  const programme = rotation();
  programme.deviceToken = 'private-value';
  programme.rotation[0].stream_key = 'private-value';
  programme.persistent_layer_ids.private = ['private-value'];
  const value = publicSettings({ everyday_display: programme }).everyday_display;
  assert.deepEqual(value, rotation());
  assert.equal(JSON.stringify(value).includes('private-value'), false);
});

test('automatic prayer phases and existing scheduled rules keep priority over the rotation', () => {
  const input = structuredClone(DEFAULT_TV_SETTINGS);
  input.everyday_display = rotation();
  input.scheduled_scenes = [
    {
      id: 'friday-night',
      name: 'Evening notices',
      enabled: true,
      days: [5],
      all_day: false,
      start_time: '22:00',
      end_time: '01:00',
      layouts: structuredClone(input.display_layouts),
    },
  ];
  input.scheduled_scenes[0].layouts = {
    landscape: input.display_layouts.landscape.standby,
    portrait: input.display_layouts.portrait.standby,
  };
  const saved = validateSettings(input);
  const during = new Date('2026-10-23T22:30:00+01:00');
  assert.equal(tvAutomaticScene(saved, during).source, 'scheduled');
  assert.equal(tvAutomaticScene(saved, new Date('2026-10-24T00:30:00+01:00')).source, 'scheduled');
  assert.equal(tvAutomaticScene(saved, new Date('2026-10-24T01:00:00+01:00')).source, 'rotation');
  for (const preset of ['before', 'jamaah', 'dhikr', 'jummah', 'ramadan']) {
    const current = tvAutomaticScene(saved, during, { preset });
    assert.equal(current.source, 'automatic');
    assert.deepEqual(current.scene, saved.display_layouts.landscape[preset]);
  }
  assert.equal(tvAutomaticScene(saved, during, { includeScheduled: false }).source, 'rotation');
  assert.equal(tvAutomaticScene(publicSettings(saved), during).source, 'rotation');
});

test('the shared validator rejects invalid programmes, timing, fixed item IDs and blocked content', () => {
  for (const value of [null, [], 'rotation'])
    assert.throws(() => validateSettings({ everyday_display: value }), /everyday display/i);
  for (const update of [
    { mode: 'random' },
    { fixed_scene: 'camera' },
    { rotation: [] },
    { rotation: null },
    { rotation: [{ kind: 'unknown', duration_seconds: 20 }] },
    { rotation: [{ kind: 'iftar', duration_seconds: 4 }] },
    { rotation: [{ kind: 'iftar', duration_seconds: 301 }] },
    { rotation: [{ kind: 'iftar', duration_seconds: 10.5 }] },
    {
      rotation: [
        { kind: 'iftar', duration_seconds: 10 },
        { kind: 'iftar', duration_seconds: 20 },
      ],
    },
    { persistent_layer_ids: { landscape: ['missing'], portrait: [] } },
    { persistent_layer_ids: null },
    { persistent_layer_ids: { landscape: null, portrait: [] } },
    { persistent_layer_ids: { landscape: ['standby-times', 'standby-times'], portrait: [] } },
  ])
    assert.throws(() => validateSettings({ everyday_display: { ...rotation(), ...update } }));
  const blocked = structuredClone(DEFAULT_TV_SETTINGS);
  blocked.everyday_display = rotation();
  blocked.everyday_display.persistent_layer_ids.landscape =
    blocked.display_layouts.landscape.standby.layers.map((layer) => layer.id);
  assert.throws(() => validateSettings(blocked), /room|space/i);
});
