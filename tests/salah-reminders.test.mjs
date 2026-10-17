import test from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import { reminderProblem, DEFAULT_SALAH_REMINDERS } from '../src/lib/salahReminderSettings.js';
import { createReminderClient, reminderSupport } from '../src/lib/salahRemindersClient.js';
import {
  validSubscription,
  notificationGroups,
  reminderNotification,
} from '../supabase/functions/salah-reminders/validation.mjs';

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  keys: { p256dh: 'B' + 'a'.repeat(86), auth: 'b'.repeat(22) },
};
const config = { ready: true, publicKey: webpush.generateVAPIDKeys().publicKey };
function fixture(options = {}) {
  const calls = [],
    storage = new Map();
  let sub = null,
    permission = 'default';
  const worker = {
    active: { scriptURL: 'https://jicmasjid.org/salah-reminders-sw.js' },
    pushManager: {
      getSubscription: async () => sub,
      subscribe: async () => {
        calls.push('subscribe');
        sub = {
          toJSON: () => subscription,
          unsubscribe: async () => {
            calls.push('unsubscribe');
            sub = null;
            return true;
          },
        };
        return sub;
      },
    },
  };
  const env = {
    window: { isSecureContext: true, PushManager: {}, matchMedia: () => ({ matches: false }) },
    navigator: {
      userAgent: 'Android',
      serviceWorker: {
        getRegistration: async () => worker,
        register: async () => {
          calls.push('register');
        },
        ready: Promise.resolve(worker),
      },
    },
    Notification: {
      get permission() {
        return permission;
      },
      requestPermission: async () => {
        calls.push('permission');
        permission = options.deny ? 'denied' : 'granted';
        return permission;
      },
    },
    crypto: {
      randomUUID: () => '10000000-0000-4000-8000-000000000001',
      getRandomValues: (values) => values.fill(4),
    },
    atob: globalThis.atob,
    storage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => {
        if (options.blockStorage) throw new Error('blocked');
        storage.set(key, value);
      },
      removeItem: (key) => storage.delete(key),
    },
  };
  const api = async (action, body) => {
    calls.push(action);
    if (options.fail === action) throw new Error('Network failed');
    return action === 'config'
      ? config
      : action === 'save'
        ? { active: true, preferences: body.preferences }
        : { active: false };
  };
  return { env, calls, storage, client: createReminderClient(api, env) };
}
test('reminders validate independent timings, selected prayers and no sunrise', () => {
  assert.equal(reminderProblem(DEFAULT_SALAH_REMINDERS), '');
  for (const patch of [
    { start: false, jamaah: false },
    { startMinutes: -1 },
    { jamaahMinutes: 61 },
    { startMinutes: 1.5 },
    { startMinutes: '' },
    { prayers: [] },
    { prayers: ['sunrise'] },
    { prayers: ['fajr', 'fajr'] },
  ])
    assert.ok(reminderProblem({ ...DEFAULT_SALAH_REMINDERS, ...patch }));
});
test('push endpoints reject SSRF, unsafe URLs and invalid subscription keys', () => {
  assert.deepEqual(validSubscription(subscription), subscription);
  for (const endpoint of [
    'http://fcm.googleapis.com/x',
    'https://localhost/x',
    'https://127.0.0.1/x',
    'https://fcm.googleapis.com.evil.test/x',
    'https://user:password@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:444/x',
  ])
    assert.throws(() => validSubscription({ ...subscription, endpoint }));
  assert.throws(() =>
    validSubscription({ ...subscription, keys: { auth: 'invalid', p256dh: 'invalid' } }),
  );
});
test('the sender library generates the VAPID key format used by client and Vault', () => {
  const keys = webpush.generateVAPIDKeys();
  assert.equal(keys.publicKey.length, 87);
  assert.equal(keys.privateKey.length, 43);
  webpush.setVapidDetails('mailto:info@jicwoodlands.org.uk', keys.publicKey, keys.privateKey);
});
test('opening reminder setup never requests permission, registers a worker or subscribes', async () => {
  const f = fixture();
  const state = await f.client.inspect();
  assert.equal(state.active, false);
  assert.deepEqual(f.calls, ['config']);
});
test('enabling requests permission first and confirms backend save before reporting active', async () => {
  const f = fixture();
  const result = await f.client.enable(DEFAULT_SALAH_REMINDERS, config);
  assert.equal(result.active, true);
  assert.deepEqual(f.calls, ['permission', 'register', 'subscribe', 'save']);
  assert.equal(f.storage.size, 1);
});
test('denied permission or blocked storage never enrolls a device', async () => {
  for (const options of [{ deny: true }, { blockStorage: true }]) {
    const f = fixture(options);
    await assert.rejects(f.client.enable(DEFAULT_SALAH_REMINDERS, config));
    assert.ok(!f.calls.includes('save'));
    assert.ok(!f.calls.includes('subscribe'));
  }
});
test('a failed registration save retains the device proof to safely retry', async () => {
  const f = fixture({ fail: 'save' });
  await assert.rejects(f.client.enable(DEFAULT_SALAH_REMINDERS, config), /Network failed/);
  assert.equal(f.storage.size, 1);
});
test('failed removal does not unsubscribe or discard the management proof', async () => {
  const f = fixture({ fail: 'remove' });
  await f.client.enable(DEFAULT_SALAH_REMINDERS, config);
  await assert.rejects(f.client.disable(), /Network failed/);
  assert.equal(f.storage.size, 1);
  assert.ok(!f.calls.includes('unsubscribe'));
});
test('successful turn-off removes server record before unsubscribing and clearing proof', async () => {
  const f = fixture();
  await f.client.enable(DEFAULT_SALAH_REMINDERS, config);
  f.calls.length = 0;
  await f.client.disable();
  assert.deepEqual(f.calls, ['remove', 'unsubscribe']);
  assert.equal(f.storage.size, 0);
});
test('iPhone setup requires Home Screen, whereas supported Android can enable directly', () => {
  const f = fixture();
  f.env.navigator.userAgent = 'iPhone';
  assert.equal(reminderSupport(f.env), 'install');
  f.env.navigator.standalone = true;
  assert.equal(reminderSupport(f.env), 'supported');
  f.env.navigator.userAgent = 'Android';
  f.env.navigator.standalone = false;
  assert.equal(reminderSupport(f.env), 'supported');
});
test('simultaneous start and Jama’ah are one notification but retain both receipt proofs', () => {
  const jobs = ['start', 'jamaah'].map((kind, index) => ({
    id: `receipt-${index}`,
    lease: `lease-${index}`,
    device_id: 'device',
    prayer: 'maghrib',
    kind,
    event_at: '2026-10-14T17:18:00Z',
    scheduled_at: '2026-10-14T17:08:00Z',
  }));
  const [group] = notificationGroups(jobs);
  assert.equal(group.jobs.length, 2);
  const note = reminderNotification(group, new Date('2026-10-14T17:08:00Z'));
  assert.match(note.title, /start and Jama’ah/);
  assert.match(note.body, /10 minutes/);
  assert.match(note.body, /6:18/);
});

test('iPhone Window.atob receives the Window receiver when creating a push subscription', async () => {
  const { env, client } = fixture();
  env.navigator.userAgent = 'iPhone';
  env.navigator.standalone = true;
  env.atob = function (value) {
    assert.equal(this, env.window, 'Safari requires the real Window receiver');
    return globalThis.atob(value);
  };
  const result = await client.enable(DEFAULT_SALAH_REMINDERS, config, null);
  assert.equal(result.active, true);
});
