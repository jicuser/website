import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import webpush from 'web-push';
import { readFile } from 'node:fs/promises';
const result = await build({
  entryPoints: [
    new URL('../supabase/functions/salah-reminders/index.ts', import.meta.url).pathname,
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  plugins: [
    {
      name: 'reminder-handler',
      setup(b) {
        b.onResolve({ filter: /^npm:/ }, (args) => ({ path: args.path, namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('web-push')
            ? 'export default globalThis.fixture.push;'
            : 'export const createClient=()=>globalThis.fixture.client;',
        }));
      },
    },
  ],
});
function fixture() {
  const keys = webpush.generateVAPIDKeys(),
    calls = [],
    sent = [];
  const runtime = {
    enabled: true,
    public_key: keys.publicKey,
    private_key: keys.privateKey,
    dispatch_secret: 'c'.repeat(64),
    last_run_at: new Date().toISOString(),
  };
  const data = {
    runtime,
    calls,
    sent,
    push: {
      generateVAPIDKeys: () => keys,
      sendNotification: async (sub, payload) => {
        sent.push({ sub, payload });
      },
    },
    client: {
      rpc: async (name, params) => {
        calls.push({ name, params });
        return {
          data:
            name === 'salah_reminder_runtime'
              ? runtime
              : name === 'salah_reminder_limit'
                ? true
                : name === 'salah_reminder_claim'
                  ? []
                  : name === 'salah_reminder_device'
                    ? { active: true, id: params.p_id, preferences: params.p_preferences }
                    : null,
          error: null,
        };
      },
    },
  };
  let handler;
  runInNewContext(result.outputFiles[0].text, {
    fixture: data,
    Deno: {
      env: { get: () => 'configured' },
      serve: (callback) => {
        handler = callback;
      },
    },
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Request,
    Response,
    URL,
    Date,
    Intl,
    Error,
  });
  return {
    data,
    request: (body, headers = {}, method = 'POST') =>
      handler(
        new Request('https://project.supabase.co/functions/v1/salah-reminders', {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
        }),
      ),
  };
}
test('public readiness exposes no signing key or scheduler proof', async () => {
  const f = fixture(),
    response = await f.request(null, {}, 'GET'),
    body = await response.json();
  assert.equal(body.ready, true);
  assert.deepEqual(Object.keys(body).sort(), ['publicKey', 'ready']);
  assert.ok(!JSON.stringify(body).includes(f.data.runtime.private_key));
  assert.ok(!JSON.stringify(body).includes(f.data.runtime.dispatch_secret));
});
test('unauthorised dispatcher requests cannot claim or send reminders', async () => {
  const f = fixture();
  assert.equal((await f.request({}, { 'x-salah-dispatch': 'wrong' })).status, 401);
  assert.ok(!f.data.calls.some((call) => call.name === 'salah_reminder_claim'));
  assert.equal(f.data.sent.length, 0);
  assert.equal((await f.request({ action: 'dispatch' })).status, 400);
});
test('private device actions require a strong proof and trusted browser origin', async () => {
  const f = fixture();
  assert.equal((await f.request({ action: 'status', id: 'guess', token: 'guess' })).status, 400);
  assert.equal((await f.request({}, { origin: 'https://evil.test' })).status, 403);
  assert.equal(f.data.sent.length, 0);
});
test('a verified empty dispatch updates its heartbeat without notifying anyone', async () => {
  const f = fixture();
  const response = await f.request({}, { 'x-salah-dispatch': f.data.runtime.dispatch_secret });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sent, 0);
  assert.ok(f.data.calls.some((call) => call.name === 'salah_reminder_heartbeat'));
  assert.equal(f.data.sent.length, 0);
});
test('the notification worker cannot open a supplied external URL or cache website data', async () => {
  const source = await readFile(
    new URL('../public/salah-reminders-sw.js', import.meta.url),
    'utf8',
  );
  const events = {},
    windows = [],
    shown = [];
  const self = {
    location: { origin: 'https://jicmasjid.org' },
    addEventListener: (name, handler) => {
      events[name] = handler;
    },
    registration: {
      showNotification: async (title, options) => {
        shown.push({ title, options });
      },
    },
    clients: { matchAll: async () => [], openWindow: async (url) => windows.push(url) },
  };
  runInNewContext(source, { self, URL });
  let promise;
  events.push({
    data: { json: () => ({ title: 'Test', body: 'Reminder', url: 'https://evil.test' }) },
    waitUntil: (value) => {
      promise = value;
    },
  });
  await promise;
  assert.equal(shown[0].options.data.url, '/prayer-times/reminders');
  events.notificationclick({
    notification: { close() {} },
    waitUntil: (value) => {
      promise = value;
    },
  });
  await promise;
  assert.deepEqual(windows, ['https://jicmasjid.org/prayer-times/reminders']);
  assert.equal(events.fetch, undefined);
});
