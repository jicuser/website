import test from 'node:test';
import assert from 'node:assert/strict';
import { isSingleInputPresentation } from '../src/lib/presentationMode.js';

const single = () => ({
  active_scene_id: 'main',
  scenes: [{
    id: 'main',
    name: 'Main view',
    layers: [{ id: 'source', type: 'empty', x: 0, y: 0, width: 100, height: 100 }],
  }],
});

test('a new full-screen input can use Simple without selecting an input count', () => {
  assert.equal(isSingleInputPresentation(single()), true);
});

test('a configured device remains eligible without changing its identity or options', () => {
  const value = single();
  Object.assign(value.scenes[0].layers[0], {
    type: 'input', slot: 'input-1', capture: 'camera', name: 'Teacher phone', audio: true,
  });
  const before = structuredClone(value);
  assert.equal(isSingleInputPresentation(value), true);
  assert.deepEqual(value, before);
});

test('non-device content can also be presented as a single input', () => {
  for (const type of ['poster', 'youtube', 'video', 'camera', 'text', 'times', 'clock']) {
    const value = single();
    value.scenes[0].layers[0].type = type;
    assert.equal(isSingleInputPresentation(value), true, type);
  }
});

test('additional scenes are never silently hidden or discarded', () => {
  const value = single();
  value.scenes.push({ id: 'other', layers: [] });
  const before = structuredClone(value);
  assert.equal(isSingleInputPresentation(value), false);
  assert.deepEqual(value, before);
});

test('multiple inputs always retain the Advanced editor', () => {
  const value = single();
  value.scenes[0].layers.push({ ...value.scenes[0].layers[0], id: 'second' });
  assert.equal(isSingleInputPresentation(value), false);
});

test('custom geometry is not stretched or reset when selecting an editor', () => {
  for (const [property, number] of [['x', 5], ['y', 5], ['width', 50], ['height', 50]]) {
    const value = single();
    value.scenes[0].layers[0][property] = number;
    const before = structuredClone(value);
    assert.equal(isSingleInputPresentation(value), false, property);
    assert.deepEqual(value, before);
  }
});

test('missing or malformed layouts do not enter Simple', () => {
  for (const value of [undefined, null, {}, { scenes: [] }, { scenes: [null] },
    { active_scene_id: 'main', scenes: [{ id: 'main', layers: [null] }] },
    { active_scene_id: 'main', scenes: [{ id: 'main', layers: { length: 1 } }] },
  ]) assert.equal(isSingleInputPresentation(value), false);
});

test('an empty scene keeps the Advanced input-count control available', () => {
  const value = single();
  value.scenes[0].layers = [];
  assert.equal(isSingleInputPresentation(value), false);
});

test('an invalid active scene is not changed by the editor-mode check', () => {
  const value = single();
  value.active_scene_id = 'missing';
  assert.equal(isSingleInputPresentation(value), false);
  assert.equal(value.active_scene_id, 'missing');
});
