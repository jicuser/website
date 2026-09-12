import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStreamScenes,
  loadSceneTemplate,
  streamSettings,
} from '../src/lib/streamWorkspace.js';
import { hasSceneContent } from '../supabase/functions/_shared/tv-scenes.js';
import {
  DEFAULT_TV_SETTINGS,
  tvScene,
  validateSettings,
} from '../supabase/functions/_shared/tv.js';

const ids = (prefix = 'new') => {
  let count = 0;
  return () => `${prefix}-${++count}`;
};
const region = (type, extra = {}) => ({
  id: 'area',
  type,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...extra,
});
const input = (slot, extra = {}) =>
  region('input', {
    id: slot,
    slot,
    capture: 'camera',
    audio: false,
    ...extra,
  });
const scene = (id, layers = []) => ({ id, name: id, overlap: true, layers });
const workspace = (scenes, extra = {}) => ({
  ...DEFAULT_TV_SETTINGS,
  scenes,
  active_scene_id: scenes[0].id,
  ...extra,
});

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

test('a fresh stream contains independent named scenes with empty full-screen areas', () => {
  const nextId = ids();
  const first = createStreamScenes(3, nextId);
  const second = createStreamScenes(2, nextId);
  assert.deepEqual(
    first.map((item) => item.name),
    ['Scene 1', 'Scene 2', 'Scene 3'],
  );
  const allIds = [...first, ...second].flatMap((item) => [
    item.id,
    ...item.layers.map((layer) => layer.id),
  ]);
  assert.equal(new Set(allIds).size, 10);
  for (const item of [...first, ...second]) {
    assert.equal(item.overlap, true);
    assert.equal(item.layers.length, 1);
    assert.deepEqual(item.layers[0], region('empty', { id: item.layers[0].id }));
    assert.equal(hasSceneContent(item), false);
  }
  first[0].layers[0].type = 'clock';
  assert.equal(first[1].layers[0].type, 'empty');
  assert.equal(second[0].layers[0].type, 'empty');
});

test('scene counts stay within one to six without malformed count errors', () => {
  for (const [raw, count] of [
    [0, 1],
    [-2, 1],
    [undefined, 1],
    ['bad', 1],
    ['3', 3],
    [2.9, 2],
    [999, 6],
    [Infinity, 6],
  ])
    assert.equal(createStreamScenes(raw, ids()).length, count);
});

test('prepared empty areas do not put an output into presentation playback', () => {
  const draft = workspace(createStreamScenes(3, ids()));
  const prepared = streamSettings(DEFAULT_TV_SETTINGS, draft);
  assert.equal(tvScene(prepared), 'normal');
  const saved = validateSettings(prepared);
  assert.equal(saved.scene_mode, 'normal');
  assert.equal(saved.class_until, '');
  assert.deepEqual(saved.scenes, draft.scenes);
});

test('a loaded template replaces only the selected scene and refreshes region IDs', () => {
  const settings = freeze(
    workspace([
      scene('selected', [region('text', { text: 'Replace this' })]),
      scene('keep', [region('clock')]),
    ]),
  );
  const template = freeze(
    scene('template', [
      region('youtube', {
        id: 'youtube',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        audio: false,
        width: 50,
      }),
      region('video', {
        id: 'video',
        url: 'https://media.example.test/lesson.mp4',
        audio: true,
        x: 50,
        width: 50,
      }),
    ]),
  );
  const result = loadSceneTemplate(settings, template, ids());
  assert.equal(result.active_scene_id, 'selected');
  assert.equal(result.scenes[0].id, 'selected');
  assert.equal(result.scenes[0].name, 'template');
  assert.deepEqual(
    result.scenes[0].layers.map((item) => item.id),
    ['new-1', 'new-2'],
  );
  assert.deepEqual(
    result.scenes[0].layers.map((item) => item.url),
    template.layers.map((item) => item.url),
  );
  assert.equal(result.scenes[0].layers[1].audio, true);
  assert.strictEqual(result.scenes[1], settings.scenes[1]);
  assert.equal(settings.scenes[0].layers[0].text, 'Replace this');
  assert.deepEqual(
    template.layers.map((item) => item.id),
    ['youtube', 'video'],
  );
});

test('template camera remapping preserves distinct sources with equal optional labels', () => {
  for (const name of [undefined, '', 'Camera']) {
    const settings = freeze(
      workspace([
        scene('selected'),
        scene('existing', [input('input-3', { name }), input('input-4', { name })]),
      ]),
    );
    const template = freeze(
      scene('template', [input('input-1', { name }), input('input-2', { name })]),
    );
    const loaded = loadSceneTemplate(settings, template, ids());
    const sources = loaded.scenes[0].layers;
    assert.deepEqual(
      sources.map((item) => item.slot),
      ['input-3', 'input-4'],
    );
    assert.equal(new Set(sources.map((item) => item.slot)).size, 2);
    assert.deepEqual(
      sources.map((item) => item.name),
      [name, name],
    );
    assert.deepEqual(
      template.layers.map((item) => item.slot),
      ['input-1', 'input-2'],
    );
  }
});

test('repeated use of a logical camera across saved scenes reuses its existing slot', () => {
  const settings = freeze(
    workspace([
      scene('selected'),
      scene('wide', [input('input-3', { name: 'Lectern phone' })]),
      scene('close', [input('input-3', { name: 'Lectern phone' })]),
    ]),
  );
  const template = freeze(
    scene('template', [input('input-1', { name: 'Lectern phone', audio: true })]),
  );
  const loaded = loadSceneTemplate(settings, template, ids());
  assert.equal(loaded.scenes[0].layers[0].slot, 'input-3');
  assert.equal(loaded.scenes[0].layers[0].audio, true);
  assert.equal(loaded.scenes[1].layers[0].audio, false);
  assert.equal(loaded.scenes[2].layers[0].slot, 'input-3');
});

test('matching labels never reuse a slot with a different capture type', () => {
  const settings = freeze(
    workspace([
      scene('selected'),
      scene('other', [input('input-1', { name: 'Lectern', capture: 'screen' })]),
    ]),
  );
  const template = freeze(
    scene('template', [input('input-1', { name: 'Lectern', capture: 'camera' })]),
  );
  const loaded = loadSceneTemplate(settings, template, ids());
  assert.equal(loaded.scenes[0].layers[0].slot, 'input-2');
  assert.equal(loaded.scenes[0].layers[0].capture, 'camera');
  assert.equal(loaded.scenes[1].layers[0].capture, 'screen');
});

test('a full workspace permits known devices and rejects extra devices without partial changes', () => {
  const settings = freeze(
    workspace([
      scene('selected'),
      scene(
        'other',
        Array.from({ length: 4 }, (_, i) => input(`input-${i + 1}`, { name: `Camera ${i + 1}` })),
      ),
    ]),
  );
  const known = scene('known', [input('input-1', { name: 'Camera 4' })]);
  assert.equal(loadSceneTemplate(settings, known, ids()).scenes[0].layers[0].slot, 'input-4');
  const before = JSON.stringify(settings);
  const fresh = freeze(scene('new-camera', [input('input-1', { name: 'Visitor camera' })]));
  assert.throws(() => loadSceneTemplate(settings, fresh, ids()), /four available/);
  assert.equal(JSON.stringify(settings), before);
  assert.equal(fresh.layers[0].slot, 'input-1');
});

test('saved poster lists, direct CCTV links and layout settings survive template loading', () => {
  const template = freeze({
    ...scene('saved', [
      region('poster', {
        id: 'posters',
        poster_ids: ['notice', 'event'],
        rotation_seconds: 30,
        width: 50,
      }),
      region('camera', {
        id: 'cctv',
        url: 'https://camera.example.test/hall.m3u8',
        protocol: 'hls',
        audio: false,
        x: 50,
        width: 50,
      }),
    ]),
    overlap: false,
  });
  const original = JSON.stringify(template);
  const result = loadSceneTemplate(workspace([scene('selected')]), template, ids());
  assert.equal(result.scenes[0].overlap, true);
  assert.deepEqual(result.scenes[0].layers[0].poster_ids, ['notice', 'event']);
  assert.equal(result.scenes[0].layers[0].rotation_seconds, 30);
  assert.equal(result.scenes[0].layers[1].url, template.layers[1].url);
  assert.equal(result.scenes[0].layers[1].protocol, 'hls');
  assert.equal(result.scenes[0].layers[1].x, 50);
  assert.equal(JSON.stringify(template), original);
});

test('starting a prepared workspace keeps the latest public background settings', () => {
  const latest = freeze({
    ...DEFAULT_TV_SETTINGS,
    poster_ids: ['latest-poster'],
    rotation_seconds: 45,
    auto_jummah: false,
    include_events: false,
    jummah_notice: 'Latest notice',
    show_clock: false,
    future_background_setting: 'retained',
    class_until: '2030-01-01T12:00:00Z',
  });
  const draft = freeze(
    workspace([scene('lesson', [region('text', { text: 'Prepared lesson' })])], {
      poster_ids: ['old-poster'],
      rotation_seconds: 10,
      auto_jummah: true,
      jummah_notice: 'Old notice',
      muted: false,
    }),
  );
  const result = streamSettings(latest, draft);
  assert.deepEqual(result.poster_ids, ['latest-poster']);
  assert.equal(result.rotation_seconds, 45);
  assert.equal(result.auto_jummah, false);
  assert.equal(result.include_events, false);
  assert.equal(result.jummah_notice, 'Latest notice');
  assert.equal(result.show_clock, false);
  assert.equal(result.future_background_setting, 'retained');
  assert.equal(result.scene_mode, 'teaching');
  assert.equal(result.class_until, '');
  assert.equal(result.active_scene_id, 'lesson');
  assert.equal(result.muted, false);
  assert.deepEqual(result.scenes, draft.scenes);
  assert.equal(latest.scene_mode, 'normal');
  assert.equal(draft.scene_mode, 'normal');
});

test('saved stream settings retain every scene and input detail without live credentials', async () => {
  const { streamTemplateSettings, streamSetupProblem } =
    await import('../supabase/functions/_shared/stream-template.js');
  const config = workspace(
    [
      scene('Welcome', [region('text', { text: 'Welcome everyone' })]),
      scene('Lesson', [input('input-1', { name: 'Haider’s iPhone', audio: true })]),
    ],
    { active_scene_id: 'Lesson', muted: false, token: 'private', session_id: 'active-session' },
  );
  const saved = streamTemplateSettings(config, 'mens-main');
  assert.equal(saved.scenes.length, 2);
  assert.equal(saved.active_scene_id, 'Lesson');
  assert.equal(saved.muted, false);
  assert.equal(saved.scenes[1].layers[0].name, 'Haider’s iPhone');
  assert.equal(saved.scenes[1].layers[0].audio, true);
  assert.deepEqual(Object.keys(saved).sort(), ['active_scene_id', 'muted', 'scenes']);
  assert.equal(streamSetupProblem(config), '');
  assert.match(
    streamSetupProblem(workspace([scene('Welcome', [region('empty')])])),
    /Select an input type/,
  );
  config.scenes[1].name = 'Scene 1';
  assert.throws(() => streamTemplateSettings(config, 'mens-main'), /descriptive/);
});

test('scene and device names reject generic placeholders and allow recognisable names', async () => {
  const { nameProblem, validateDeviceName } =
    await import('../supabase/functions/_shared/tv-scenes.js');
  for (const name of ['', 'Device 1', 'stream 1', 'Scene 2', 'Input-3', 'Camera 1', 'Screen 1']) {
    assert.ok(nameProblem(name));
    assert.throws(() => validateDeviceName(name));
  }
  for (const name of [
    'Main lesson',
    'Haider’s iPhone',
    'Classroom laptop',
    'Main hall projector',
  ]) {
    assert.equal(nameProblem(name), '');
    assert.equal(validateDeviceName(name), name);
  }
});
