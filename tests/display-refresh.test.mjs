import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeDisplayRefresh } from '../src/lib/displayRefresh.js';
import { broadcastDisplayRefresh } from '../supabase/functions/_shared/display-refresh.js';

test('refresh hints are throttled, carry no display state, and stop after cleanup', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 });
  let event,
    subscription,
    updates = 0,
    removed = 0;
  const channel = {
    on(type, filter, callback) {
      assert.equal(type, 'broadcast');
      assert.equal(filter.event, 'refresh');
      event = callback;
      return this;
    },
    subscribe(callback) {
      subscription = callback;
      return this;
    },
  };
  const stop = subscribeDisplayRefresh(
    {
      channel(topic) {
        assert.equal(topic, 'display-state:mens-main');
        return channel;
      },
      removeChannel(value) {
        assert.equal(value, channel);
        removed++;
        return Promise.resolve();
      },
    },
    'mens-main',
    (...args) => {
      assert.deepEqual(args, []);
      updates++;
    },
  );
  subscription('SUBSCRIBED');
  t.mock.timers.tick(0);
  assert.equal(updates, 1);
  for (let i = 0; i < 30; i++) event({ payload: { paired: true, settings: 'untrusted' } });
  t.mock.timers.tick(999);
  assert.equal(updates, 1);
  t.mock.timers.tick(1);
  assert.equal(updates, 2);
  event();
  stop();
  t.mock.timers.tick(1000);
  assert.equal(updates, 2);
  assert.equal(removed, 1);
});

test('server notifications contain only a hall topic and an empty refresh payload', async () => {
  let body;
  await broadcastDisplayRefresh(
    'https://example.test',
    'server-only-key',
    'mens-main',
    async (url, options) => {
      assert.equal(url, 'https://example.test/realtime/v1/api/broadcast');
      assert.equal(options.headers.apikey, 'server-only-key');
      body = JSON.parse(options.body);
      return new Response(null, { status: 202 });
    },
  );
  assert.deepEqual(body, {
    messages: [{ topic: 'display-state:mens-main', event: 'refresh', payload: {} }],
  });
  await assert.rejects(
    broadcastDisplayRefresh(
      'https://example.test',
      'key',
      'mens-main',
      async () => new Response(null, { status: 503 }),
    ),
    /503/,
  );
});
