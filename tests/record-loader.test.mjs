import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordLoader } from '../src/lib/recordLoader.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('a stalled read times out, aborts its request and allows retry', async () => {
  const states = [];
  let signal;
  let attempt = 0;
  const loader = createRecordLoader(
    (nextSignal) => {
      signal = nextSignal;
      return ++attempt === 1 ? new Promise(() => {}) : ['Recovered form'];
    },
    (state) => states.push(state),
    { interval: 0, timeoutMs: 15 },
  );
  await loader.refresh();
  assert.equal(signal.aborted, true);
  assert.equal(states.at(-1).loading, false);
  assert.match(states.at(-1).error, /timed out/);
  await loader.refresh();
  assert.deepEqual(states.at(-1), { data: ['Recovered form'], loading: false, error: '' });
  loader.dispose();
});

test('repeated refreshes coalesce, and disposed reads cannot publish stale records', async () => {
  let resolve;
  let reads = 0;
  const states = [];
  const loader = createRecordLoader(
    () => {
      reads++;
      return new Promise((done) => {
        resolve = done;
      });
    },
    (state) => states.push(state),
    { interval: 0 },
  );
  const first = loader.refresh();
  await flush();
  loader.refresh();
  loader.refresh();
  loader.refresh();
  assert.equal(reads, 1);
  resolve(['First']);
  await first;
  await flush();
  assert.equal(reads, 2, 'Only one follow-up should run');
  loader.dispose();
  const before = states.length;
  resolve(['Obsolete']);
  await flush();
  assert.equal(states.length, before);
});

test('revoked access clears previously loaded records', async () => {
  let allowed = true;
  let current;
  const loader = createRecordLoader(
    () => {
      if (!allowed) throw new Error('Access denied');
      return ['Private response'];
    },
    (state) => {
      current = state;
    },
    { interval: 0 },
  );
  await loader.refresh();
  assert.deepEqual(current.data, ['Private response']);
  allowed = false;
  await loader.refresh();
  assert.deepEqual(current, { data: null, loading: false, error: 'Access denied' });
  loader.dispose();
});
