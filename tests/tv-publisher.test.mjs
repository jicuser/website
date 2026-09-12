import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublisherController } from '../src/lib/tvPublisherController.js';

const settle = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const fakeStream = () => {
  const track = {
    stopped: false,
    stop() {
      this.stopped = true;
    },
    addEventListener() {},
  };
  return { track, getTracks: () => [track], getVideoTracks: () => [track] };
};
function fixture(t, overrides = {}) {
  const calls = [];
  const states = [];
  const media = fakeStream();
  let captures = 0;
  let session = 0;
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const publisher = createPublisherController({
    screenId: 'mens-main',
    slot: 'input-1',
    capture: () => {
      captures++;
      return Promise.resolve(media);
    },
    request: async (action, payload) => {
      calls.push({ action, payload });
      if (overrides.request) return overrides.request(action, payload);
      if (action === 'start') return { sessionId: `session-${++session}`, iceServers: [] };
      if (action === 'peers') return { peers: [] };
      return {};
    },
    notify: (state) => states.push(state),
    waitForIce: async () => {},
    storage,
    ...(overrides.capture ? { capture: overrides.capture } : {}),
  });
  t.after(() => publisher.destroy());
  return {
    publisher,
    calls,
    media,
    states,
    storage,
    starts: () => calls.filter((call) => call.action === 'start'),
    stops: () => calls.filter((call) => call.action === 'stop'),
    captures: () => captures,
    current: () => states.at(-1),
  };
}

test('preparing a source invokes capture in the click and does not publish before Start stream', async (t) => {
  const f = fixture(t);
  f.publisher.configure({ setupOnly: true });
  const starting = f.publisher.start('camera', true, 'Front camera');
  assert.equal(f.captures(), 1);
  assert.equal(f.calls.length, 0);
  await starting;
  assert.equal(f.current().phase, 'ready');
  assert.equal(f.current().stream, f.media);
  assert.equal(f.calls.length, 0);
  f.publisher.configure({ setupOnly: false, presentationId: 'presentation-a' });
  await settle();
  assert.equal(f.captures(), 1);
  assert.equal(f.starts().length, 1);
  assert.equal(f.starts()[0].payload.deviceName, 'Front camera');
  assert.equal(f.current().phase, 'publishing');
  assert.equal(f.media.track.stopped, false);
});

test('ordinary updates and dialog changes do not restart a prepared or published source', async (t) => {
  const f = fixture(t);
  f.publisher.configure({ setupOnly: true });
  await f.publisher.start('screen');
  for (let count = 0; count < 5; count++) f.publisher.configure({ setupOnly: true });
  assert.equal(f.calls.length, 0);
  f.publisher.configure({ setupOnly: false, presentationId: 'presentation-a' });
  await settle();
  for (let count = 0; count < 5; count++)
    f.publisher.configure({ setupOnly: false, presentationId: 'presentation-a' });
  await settle();
  assert.equal(f.starts().length, 1);
  assert.equal(f.captures(), 1);
  assert.equal(f.stops().length, 0);
});

test('a new presentation reattaches this source while preserving its local capture', async (t) => {
  const f = fixture(t);
  f.publisher.configure({ presentationId: 'presentation-a' });
  await f.publisher.start('camera');
  f.publisher.configure({ presentationId: 'presentation-b' });
  await settle();
  assert.equal(f.starts().length, 2);
  assert.deepEqual(
    f.stops().map((call) => call.payload.sessionId),
    ['session-1'],
  );
  assert.equal(f.captures(), 1);
  assert.equal(f.media.track.stopped, false);
  assert.equal(f.current().sessionId, 'session-2');
});

test('manual Stop prevents future automatic publication of the source', async (t) => {
  const f = fixture(t);
  await f.publisher.start('camera');
  await f.publisher.stop();
  f.publisher.configure({ setupOnly: false, presentationId: 'presentation-b' });
  f.publisher.retry();
  await settle();
  assert.equal(f.starts().length, 1);
  assert.equal(f.current().stream, null);
  assert.equal(f.media.track.stopped, true);
});

test('failed publication keeps the local preview and needs an explicit retry', async (t) => {
  let attempts = 0;
  const f = fixture(t, {
    request: async (action) => {
      if (action === 'start') {
        attempts++;
        if (attempts === 1)
          throw Object.assign(new Error('This source is occupied.'), { status: 409 });
        return { sessionId: 'retried', iceServers: [] };
      }
      return action === 'peers' ? { peers: [] } : {};
    },
  });
  await f.publisher.start('screen');
  assert.equal(f.current().phase, 'ready');
  assert.match(f.current().message, /occupied/);
  assert.equal(f.media.track.stopped, false);
  f.publisher.configure({ setupOnly: false });
  await settle();
  assert.equal(attempts, 1);
  f.publisher.retry();
  await settle();
  assert.equal(attempts, 2);
  assert.equal(f.current().sessionId, 'retried');
  assert.equal(f.captures(), 1);
});

test('a cancelled chooser cannot start publishing after its workspace is closed', async (t) => {
  const chooser = deferred();
  const media = fakeStream();
  const f = fixture(t, { capture: () => chooser.promise });
  const starting = f.publisher.start('screen');
  await f.publisher.destroy();
  chooser.resolve(media);
  await starting;
  assert.equal(media.track.stopped, true);
  assert.equal(f.starts().length, 0);
});

test('a late Start response is released if the operator stopped during the request', async (t) => {
  const started = deferred();
  const f = fixture(t, { request: async (action) => (action === 'start' ? started.promise : {}) });
  const starting = f.publisher.start('camera');
  await settle();
  await f.publisher.stop();
  started.resolve({ sessionId: 'late-session', iceServers: [] });
  await starting;
  assert.deepEqual(
    f.stops().map((call) => call.payload.sessionId),
    ['late-session'],
  );
  assert.equal(f.current().stream, null);
  assert.equal(f.media.track.stopped, true);
});

test('standalone contributor capture starts immediately and releases only its recorded lease', async (t) => {
  const f = fixture(t);
  f.storage.setItem('jic-capture-lease:mens-main:input-1', 'own-old-session');
  f.storage.setItem('jic-capture-lease:mens-main:input-2', 'other-slot');
  await f.publisher.start('camera');
  assert.equal(f.starts().length, 1);
  assert.deepEqual(
    f.stops().map((call) => call.payload.sessionId),
    ['own-old-session'],
  );
  assert.equal(f.storage.getItem('jic-capture-lease:mens-main:input-2'), 'other-slot');
});

test('returning to setup detaches publication but retains prepared local tracks', async (t) => {
  const f = fixture(t);
  await f.publisher.start('screen');
  f.publisher.configure({ setupOnly: true });
  await settle();
  assert.equal(f.current().phase, 'ready');
  assert.equal(f.media.track.stopped, false);
  assert.deepEqual(
    f.stops().map((call) => call.payload.sessionId),
    ['session-1'],
  );
  f.publisher.configure({ setupOnly: false, presentationId: 'next-presentation' });
  await settle();
  assert.equal(f.starts().length, 2);
  assert.equal(f.captures(), 1);
});

test('renaming a prepared source uses its final name when Start stream is pressed', async (t) => {
  const f = fixture(t);
  f.publisher.configure({ setupOnly: true });
  await f.publisher.start('camera', false, 'Camera');
  f.publisher.configure({
    setupOnly: false,
    presentationId: 'presentation-a',
    deviceName: 'Lecturer camera',
  });
  await settle();
  assert.equal(f.starts()[0].payload.deviceName, 'Lecturer camera');
});

test('changing a source type stops the old capture instead of presenting it under the new type', async (t) => {
  const f = fixture(t);
  f.publisher.configure({ setupOnly: true });
  await f.publisher.start('camera');
  f.publisher.configure({ captureKind: 'screen' });
  await settle();
  assert.equal(f.current().stream, null);
  assert.equal(f.media.track.stopped, true);
  f.publisher.configure({ setupOnly: false, presentationId: 'presentation-a' });
  await settle();
  assert.equal(f.starts().length, 0);
});

test('a late cancelled Start response cannot overwrite a newer workspace capture receipt', async (t) => {
  const started = deferred();
  const f = fixture(t, {
    request: async (action) => (action === 'start' ? started.promise : {}),
  });
  const starting = f.publisher.start('camera');
  await settle();
  await f.publisher.destroy();
  f.storage.setItem('jic-capture-lease:mens-main:input-1', 'new-workspace-session');
  started.resolve({ sessionId: 'cancelled-session', iceServers: [] });
  await starting;
  assert.equal(f.storage.getItem('jic-capture-lease:mens-main:input-1'), 'new-workspace-session');
  assert.deepEqual(
    f.stops().map((call) => call.payload.sessionId),
    ['cancelled-session'],
  );
});
