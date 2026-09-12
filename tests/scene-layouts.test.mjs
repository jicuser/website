import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENE_LAYOUTS,
  layoutRegions,
  createSceneRegions,
  arrangeScene,
  clearRegion,
  snapRect,
} from '../src/lib/sceneLayouts.js';
import { hasSceneContent, validateScenes } from '../supabase/functions/_shared/tv-scenes.js';
import { secureStreamUrl, youtubeUrl } from '../supabase/functions/_shared/tv.js';

const epsilon = 1e-8;
const geometry = ({ x, y, width, height }) => ({ x, y, width, height });
const sceneWith = (layers) => ({ id: 'lesson', name: 'Lesson', overlap: true, layers });
const validate = (scene) => validateScenes([scene], secureStreamUrl, youtubeUrl)[0];
const content = (layer) =>
  Object.fromEntries(
    Object.entries(layer).filter(([key]) => !['x', 'y', 'width', 'height'].includes(key)),
  );

function assertInBounds(rect) {
  for (const value of Object.values(geometry(rect))) assert.ok(Number.isFinite(value));
  assert.ok(rect.x >= -epsilon && rect.y >= -epsilon);
  assert.ok(rect.width >= 5 && rect.height >= 5);
  assert.ok(rect.x + rect.width <= 100 + epsilon);
  assert.ok(rect.y + rect.height <= 100 + epsilon);
}

test('all four arrangements support one to four areas inside the screen', async (t) => {
  assert.deepEqual(
    SCENE_LAYOUTS.map(([id]) => id),
    ['columns', 'grid', 'focus', 'pip'],
  );
  for (const [preset] of SCENE_LAYOUTS) {
    for (let count = 1; count <= 4; count += 1) {
      await t.test(`${preset}: ${count} areas`, () => {
        const regions = layoutRegions(count, preset);
        assert.equal(regions.length, count);
        regions.forEach(assertInBounds);
        if (preset === 'pip') {
          assert.deepEqual(regions[0], { x: 0, y: 0, width: 100, height: 100 });
          return;
        }

        // In-bounds areas with no intersecting interiors and total screen area
        // cover the canvas without gaps or duplicated space.
        const area = regions.reduce((sum, rect) => sum + rect.width * rect.height, 0);
        assert.ok(Math.abs(area - 10000) < epsilon, `covered area is ${area}`);
        for (let first = 0; first < regions.length; first += 1) {
          for (let second = first + 1; second < regions.length; second += 1) {
            const a = regions[first];
            const b = regions[second];
            const sharedWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            const sharedHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            assert.ok(sharedWidth <= epsilon || sharedHeight <= epsilon, 'areas overlap');
          }
        }
      });
    }
  }
});

test('creating areas gives each empty region a unique stable identity and valid geometry', () => {
  let nextId = 0;
  const regions = createSceneRegions(4, 'grid', () => `region-${++nextId}`);
  assert.deepEqual(
    regions.map(({ id }) => id),
    ['region-1', 'region-2', 'region-3', 'region-4'],
  );
  assert.ok(regions.every((region) => region.type === 'empty'));
  assert.equal(hasSceneContent(sceneWith(regions)), false);
  assert.deepEqual(validate(sceneWith(regions)).layers, regions);
});

test('rearranging and changing area count preserves retained content and creates empty new areas', () => {
  const scene = sceneWith([
    {
      id: 'teacher-camera',
      type: 'input',
      slot: 'input-2',
      capture: 'camera',
      name: 'Teacher phone',
      audio: true,
      x: 0,
      y: 0,
      width: 50,
      height: 100,
    },
    {
      id: 'lesson-video',
      type: 'video',
      url: 'https://media.example.test/lesson.mp4',
      audio: false,
      x: 50,
      y: 0,
      width: 50,
      height: 50,
    },
    {
      id: 'slides',
      type: 'input',
      slot: 'input-4',
      capture: 'screen',
      name: 'Classroom laptop',
      audio: false,
      x: 50,
      y: 50,
      width: 50,
      height: 50,
    },
  ]);
  const original = structuredClone(scene);
  let created = 0;
  const idFactory = () => `new-region-${++created}`;
  const expanded = arrangeScene(scene, 4, 'grid', idFactory);
  assert.equal(expanded.id, scene.id);
  assert.equal(expanded.name, scene.name);
  assert.deepEqual(expanded.layers.slice(0, 3).map(content), scene.layers.map(content));
  assert.deepEqual(content(expanded.layers[3]), { id: 'new-region-1', type: 'empty' });
  assert.deepEqual(expanded.layers.map(geometry), [
    { x: 0, y: 0, width: 50, height: 50 },
    { x: 50, y: 0, width: 50, height: 50 },
    { x: 0, y: 50, width: 50, height: 50 },
    { x: 50, y: 50, width: 50, height: 50 },
  ]);
  assert.deepEqual(validate(expanded), expanded);

  const rearranged = arrangeScene(expanded, 4, 'pip', idFactory);
  assert.deepEqual(rearranged.layers.map(content), expanded.layers.map(content));
  assert.deepEqual(rearranged.layers[0], {
    ...scene.layers[0],
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });

  const reduced = arrangeScene(rearranged, 2, 'columns', idFactory);
  assert.deepEqual(reduced.layers.map(content), scene.layers.slice(0, 2).map(content));
  assert.deepEqual(reduced.layers.map(geometry), [
    { x: 0, y: 0, width: 50, height: 100 },
    { x: 50, y: 0, width: 50, height: 100 },
  ]);
  assert.equal(created, 1, 'retained areas do not receive replacement IDs');
  assert.deepEqual(scene, original, 'the original scene and layers are unchanged');
});

test('clearing an area removes all source and private fields while keeping its ID and geometry', () => {
  const source = {
    id: 'source',
    type: 'camera',
    x: 13,
    y: 27,
    width: 62,
    height: 48,
    url: 'https://camera.example.test/private-stream',
    protocol: 'hls',
    slot: 'input-2',
    capture: 'camera',
    name: 'Private camera name',
    audio: true,
    text: 'Private lesson notice',
    poster_ids: ['private-poster'],
    rotation_seconds: 20,
    deviceToken: 'private-device-token',
    stream_key: 'private-stream-key',
  };
  const original = structuredClone(source);
  assert.deepEqual(clearRegion(source), {
    id: 'source',
    type: 'empty',
    x: 13,
    y: 27,
    width: 62,
    height: 48,
  });
  assert.deepEqual(source, original);
  assert.deepEqual(clearRegion({ ...source, x: -10, y: 90 }), {
    id: 'source',
    type: 'empty',
    x: 0,
    y: 52,
    width: 62,
    height: 48,
  });
});

test('moving areas snaps near grid lines and canvas edges while respecting bounds', () => {
  assert.deepEqual(snapRect({ x: 13.8, y: 23.7, width: 20, height: 20 }), {
    x: 15,
    y: 25,
    width: 20,
    height: 20,
  });
  assert.deepEqual(snapRect({ x: 66.7, y: 71.3, width: 32, height: 28 }), {
    x: 68,
    y: 72,
    width: 32,
    height: 28,
  });
  assert.deepEqual(snapRect({ x: 99, y: -8, width: 28, height: 24 }), {
    x: 72,
    y: 0,
    width: 28,
    height: 24,
  });
  const freePosition = { x: 12.2, y: 22.2, width: 20, height: 20 };
  assert.deepEqual(snapRect(freePosition), freePosition, 'positions outside tolerance stay free');
});

test('moving and resizing can align to another area without moving the resize origin', () => {
  const other = { x: 42.4, y: 52.6, width: 17, height: 14 };
  const moved = snapRect({ x: 21.5, y: 37, width: 20, height: 15 }, [other]);
  assert.ok(Math.abs(moved.x + moved.width - other.x) < epsilon);
  assert.ok(Math.abs(moved.y + moved.height - other.y) < epsilon);
  assert.equal(moved.width, 20);
  assert.equal(moved.height, 15);

  assert.deepEqual(snapRect({ x: 12, y: 17, width: 26.8, height: 31.8 }, [], { resize: true }), {
    x: 12,
    y: 17,
    width: 28,
    height: 33,
  });
  const resized = snapRect({ x: 12, y: 17, width: 29.7, height: 35.1 }, [other], { resize: true });
  assert.equal(resized.x, 12);
  assert.equal(resized.y, 17);
  assert.ok(Math.abs(resized.x + resized.width - other.x) < epsilon);
  assert.ok(Math.abs(resized.y + resized.height - other.y) < epsilon);
  assert.deepEqual(snapRect({ x: 70, y: 60, width: 80, height: 70 }, [], { resize: true }), {
    x: 70,
    y: 60,
    width: 30,
    height: 40,
  });
  assert.deepEqual(snapRect({ x: 95, y: 95, width: -1, height: 0 }, [], { resize: true }), {
    x: 95,
    y: 95,
    width: 5,
    height: 5,
  });
});

test('saved empty regions discard stale source data and do not count as scene content', () => {
  const region = {
    id: 'empty-area',
    type: 'empty',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    url: 'http://user:password@private.example.test',
    slot: 'input-1',
    name: 'Private device',
    audio: true,
    text: 'Private notice',
  };
  assert.deepEqual(validate(sceneWith([region])).layers, [
    { id: 'empty-area', type: 'empty', x: 0, y: 0, width: 100, height: 100 },
  ]);
  for (const scene of [undefined, null, {}, sceneWith([]), sceneWith([region])])
    assert.equal(hasSceneContent(scene), false);
  assert.equal(
    hasSceneContent(
      sceneWith([region, { id: 'clock', type: 'clock', x: 0, y: 0, width: 20, height: 20 }]),
    ),
    true,
  );
});

test('scene validation accepts HTTPS videos and YouTube with explicit audio choices', () => {
  const layers = [
    {
      id: 'video',
      type: 'video',
      url: 'https://media.example.test/lesson.mp4',
      audio: false,
      x: 0,
      y: 0,
      width: 50,
      height: 100,
    },
    {
      id: 'youtube',
      type: 'youtube',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      audio: true,
      x: 50,
      y: 0,
      width: 50,
      height: 100,
    },
  ];
  assert.deepEqual(validate(sceneWith(layers)).layers, layers);
  assert.equal(hasSceneContent(sceneWith(layers)), true);
  for (const url of [
    'http://media.example.test/lesson.mp4',
    'https://username:password@media.example.test/lesson.mp4',
    'https://username@media.example.test/lesson.mp4',
    'https://media.example.test/lesson.mp4#private',
  ])
    assert.throws(() => validate(sceneWith([{ ...layers[0], url }])), /HTTPS/);
  for (const url of [
    'http://youtu.be/dQw4w9WgXcQ',
    'https://username:password@youtu.be/dQw4w9WgXcQ',
    'https://example.test/watch?v=dQw4w9WgXcQ',
  ])
    assert.throws(() => validate(sceneWith([{ ...layers[1], url }])));
  for (const audio of [undefined, 'false', 0])
    assert.throws(() => validate(sceneWith([{ ...layers[0], audio }])), /audio/);
});
