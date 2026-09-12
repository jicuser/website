import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readCaptureLease,
  saveCaptureLease,
  clearCaptureLease,
  releaseOwnCaptureLease,
} from '../src/lib/captureLease.js';
import { publisherStatus } from '../src/lib/publisherStatus.js';

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('refresh restart releases only the lease recorded in this tab for the selected hall and slot', async () => {
  const tab = storage();
  const anotherTab = storage();
  saveCaptureLease('main', 'input-1', 'own-camera', tab);
  saveCaptureLease('main', 'input-2', 'own-screen', tab);
  saveCaptureLease('other', 'input-1', 'other-hall', tab);
  saveCaptureLease('main', 'input-1', 'colleague-camera', anotherTab);
  const stopped = [];
  await releaseOwnCaptureLease('main', 'input-1', async (id) => stopped.push(id), tab);
  assert.deepEqual(stopped, ['own-camera']);
  assert.equal(readCaptureLease('main', 'input-1', tab), '');
  assert.equal(readCaptureLease('main', 'input-2', tab), 'own-screen');
  assert.equal(readCaptureLease('other', 'input-1', tab), 'other-hall');
  assert.equal(readCaptureLease('main', 'input-1', anotherTab), 'colleague-camera');
});

test('an interrupted stop retains the receipt for retry without claiming the source was released', async () => {
  const tab = storage();
  saveCaptureLease('main', 'input-1', 'own-camera', tab);
  await assert.rejects(
    releaseOwnCaptureLease(
      'main',
      'input-1',
      async () => {
        throw new Error('Offline');
      },
      tab,
    ),
    /Offline/,
  );
  assert.equal(readCaptureLease('main', 'input-1', tab), 'own-camera');
  await releaseOwnCaptureLease('main', 'input-1', async () => {}, tab);
  assert.equal(readCaptureLease('main', 'input-1', tab), '');
});

test('a late stop acknowledgement cannot clear a newer capture receipt', async () => {
  const tab = storage();
  saveCaptureLease('main', 'input-1', 'old', tab);
  await releaseOwnCaptureLease(
    'main',
    'input-1',
    async () => {
      saveCaptureLease('main', 'input-1', 'new', tab);
    },
    tab,
  );
  clearCaptureLease('main', 'input-1', 'old', tab);
  assert.equal(readCaptureLease('main', 'input-1', tab), 'new');
});

test('a tab without a receipt never issues a stop for another device', async () => {
  const tab = storage();
  let stopped = false;
  await releaseOwnCaptureLease(
    'main',
    'input-1',
    async () => {
      stopped = true;
    },
    tab,
  );
  assert.equal(stopped, false);
});

test('capture status separates local capture, handshake, transport and failed receiving browsers', () => {
  assert.match(publisherStatus([], 0), /active on this device/);
  assert.match(publisherStatus([{ answer: null }], 0), /Waiting for it to accept/);
  assert.match(publisherStatus([{ answer: {} }], 0), /accepted the connection request/);
  assert.match(publisherStatus([{ receiver_state: 'OperationError' }], 0), /could not accept/);
  assert.match(publisherStatus([{ receiver_state: 'TimeoutError' }], 0), /Retrying/);
  assert.match(
    publisherStatus([{ receiver_state: 'connected' }], 1),
    /Check the viewing screen for the picture/,
  );
  assert.doesNotMatch(
    publisherStatus([{ receiver_state: 'connected' }], 1),
    /video received|playing|Sharing to/i,
  );
});
