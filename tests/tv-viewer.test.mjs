import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialDisplayState,
  interruptedDisplayState,
  receivedDisplayState,
  validDeviceToken,
  createDisplayToken,
  readDisplayIdentity,
  readDisplayLink,
  displayCodeRemaining,
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

test('a new presentation or rejected approval returns to posters without private source data', () => {
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
  assert.equal(locked.displayMode, 'normal');
  assert.equal(locked.paired, false);
  assert.equal(locked.deviceToken, '');
  assert.deepEqual(locked.inputs, []);
  assert.equal(JSON.stringify(locked).includes('Private lesson notes'), false);
});

test('status failure stops private playback but preserves the credential for reconnection', () => {
  const ready = receivedDisplayState(privateDisplay, token);
  const interrupted = interruptedDisplayState(ready, 'Network interrupted');
  assert.equal(interrupted.status, 'error');
  assert.equal(interrupted.displayMode, 'normal');
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

test('display identity survives reloads and malformed saved identities are replaced', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const key = 'display-test';
  const first = readDisplayIdentity(storage, key);
  assert.equal(validDeviceToken(first), true);
  assert.equal(readDisplayIdentity(storage, key), first);
  values.set(key, 'invalid');
  const replacement = readDisplayIdentity(storage, key);
  assert.notEqual(replacement, first);
  assert.equal(validDeviceToken(replacement), true);
  assert.equal(storage.getItem(key), replacement);
  assert.equal(
    readDisplayIdentity(null, key, () => token),
    token,
  );
  assert.notEqual(createDisplayToken(), createDisplayToken());
});

test('shared links require both the eight-digit code and the exact presentation identity', () => {
  const presentationId = '443af68f-4c25-4b41-bd30-418d4cc48c79';
  assert.deepEqual(readDisplayLink(`#watch=12345678&session=${presentationId}`), {
    code: '12345678',
    presentationId,
  });
  for (const hash of [
    '#watch=12345678',
    '#watch=123&session=' + presentationId,
    '#watch=12345678&session=wrong',
  ])
    assert.match(readDisplayLink(hash).error, /incomplete/);
  assert.equal(readDisplayLink('#unrelated=value'), null);
  assert.deepEqual(readDisplayLink(`#preview=${token}`), { previewToken: token });
  assert.equal(readDisplayLink('#preview=invalid'), null);
});

test('rolling display codes stop displaying at expiry and countdown never becomes negative', () => {
  const now = Date.parse('2026-09-12T12:00:00Z');
  assert.equal(displayCodeRemaining('2026-09-12T12:10:00Z', now), 600);
  assert.equal(displayCodeRemaining('2026-09-12T12:00:00.001Z', now), 1);
  assert.equal(displayCodeRemaining('2026-09-12T12:00:00Z', now), 0);
  assert.equal(displayCodeRemaining('2026-09-12T11:59:00Z', now), 0);
  assert.equal(displayCodeRemaining('invalid', now), 0);
  assert.equal(displayCodeRemaining(undefined, now), 0);
});
