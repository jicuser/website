import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialDisplayState,
  interruptedDisplayState,
  receivedDisplayState,
  validDeviceToken,
  validateSessionJoin,
} from '../src/hooks/tvScreenConnection.js';
import { DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

const token = 'a'.repeat(64);
const privateDisplay = {
  displayMode: 'teaching',
  presentationId: 'current-presentation',
  paired: true,
  settings: {
    ...DEFAULT_TV_SETTINGS,
    scene_mode: 'teaching',
    scenes: [
      {
        id: 'scene-1',
        name: 'Lesson',
        overlap: true,
        layers: [
          {
            id: 'lesson',
            type: 'text',
            text: 'Private lesson notes',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        ],
      },
    ],
  },
  inputs: [{ slot: 'input-1', id: 'camera-session', kind: 'camera' }],
};

test('an unopened display has no mode until the saved server state arrives', () => {
  const initial = initialDisplayState();
  assert.equal(initial.status, 'loading');
  assert.equal(initial.displayMode, null);
  assert.deepEqual(initial.inputs, []);
  assert.throws(() => receivedDisplayState({}, token), /confirm/);
});

test('a valid remembered session restores its private scene without becoming Normal first', () => {
  const ready = receivedDisplayState(privateDisplay, token);
  assert.equal(ready.displayMode, 'teaching');
  assert.equal(ready.settings.scene_mode, 'teaching');
  assert.equal(ready.settings.scenes[0].layers[0].text, 'Private lesson notes');
  assert.equal(ready.deviceToken, token);
  assert.equal(ready.status, 'ready');
});

test('a new presentation or rejected token drops every private source and credential', () => {
  for (const badToken of ['', 'short', token.toUpperCase()]) {
    const invalid = receivedDisplayState(privateDisplay, badToken);
    assert.equal(invalid.paired, false);
    assert.deepEqual(invalid.inputs, []);
    assert.equal(invalid.settings.scenes[0].layers.length, 0);
  }
  const locked = receivedDisplayState(
    { ...privateDisplay, paired: false, presentationId: 'new-presentation' },
    token,
  );
  assert.equal(locked.displayMode, 'teaching');
  assert.equal(locked.paired, false);
  assert.equal(locked.deviceToken, '');
  assert.deepEqual(locked.inputs, []);
  assert.equal(JSON.stringify(locked).includes('Private lesson notes'), false);
});

test('status failure stops private playback but preserves the credential for reconnection', () => {
  const ready = receivedDisplayState(privateDisplay, token);
  const interrupted = interruptedDisplayState(ready, 'Network interrupted');
  assert.equal(interrupted.status, 'error');
  assert.equal(interrupted.displayMode, 'teaching');
  assert.equal(interrupted.deviceToken, token);
  assert.equal(interrupted.paired, false);
  assert.deepEqual(interrupted.inputs, []);
  assert.equal(JSON.stringify(interrupted).includes('Private lesson notes'), false);
  assert.equal(receivedDisplayState(privateDisplay, interrupted.deviceToken).paired, true);
});

test('returning to Normal clears session sources and does not require a code', () => {
  const normal = receivedDisplayState(
    { ...privateDisplay, displayMode: 'normal', paired: false, presentationId: null },
    token,
  );
  assert.equal(normal.status, 'ready');
  assert.equal(normal.displayMode, 'normal');
  assert.equal(normal.deviceToken, '');
  assert.equal(normal.settings.scene_mode, 'normal');
  assert.deepEqual(normal.inputs, []);
});

test('session join feedback identifies the actual missing or invalid field', () => {
  assert.deepEqual(Object.keys(validateSessionJoin(' ', '')), ['name', 'code']);
  assert.deepEqual(Object.keys(validateSessionJoin('Classroom laptop', '123')), ['code']);
  assert.deepEqual(Object.keys(validateSessionJoin('x'.repeat(61), '12345678')), ['name']);
  assert.deepEqual(validateSessionJoin('Classroom laptop', '12345678'), {});
  assert.equal(validDeviceToken(token), true);
  assert.equal(validDeviceToken('12345678'), false);
});
