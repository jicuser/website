import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { createAuthRecovery } from '../src/lib/authRecovery.js';
import { createTabAuthOptions } from '../src/lib/tabAuthStorage.js';

const session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'staff-1', email: 'staff@example.invalid' },
};
const profile = { id: 'staff-1', is_active: true, permissions: ['tv'] };
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
async function until(condition) {
  const end = Date.now() + 1000;
  while (!condition()) {
    if (Date.now() > end) throw new Error('Expected auth state was not reached.');
    await pause(1);
  }
}
function mockClient() {
  let callback;
  const client = {
    signOuts: 0,
    profileCalls: 0,
    getSession: async () => ({ data: { session }, error: null }),
    getProfile: async () => ({ data: [profile], error: null }),
    auth: {
      getSession: () => client.getSession(),
      onAuthStateChange(fn) {
        callback = fn;
        return {
          data: {
            subscription: {
              unsubscribe() {
                callback = null;
              },
            },
          },
        };
      },
      async signInWithPassword() {
        client.emit('SIGNED_IN', session);
        return { data: { session, user: session.user }, error: null };
      },
      async signOut() {
        client.signOuts++;
        client.emit('SIGNED_OUT', null);
        return { error: null };
      },
    },
    rpc() {
      client.profileCalls++;
      return { abortSignal: (signal) => client.getProfile(signal) };
    },
    emit(event, value) {
      return callback?.(event, value);
    },
  };
  return client;
}

test('profile failure keeps login and Retry restores staff access without another sign in', async () => {
  const client = mockClient();
  client.getProfile = async () => ({ data: null, error: new Error('Offline') });
  const recovery = createAuthRecovery(client, () => {});
  recovery.start();
  try {
    await until(() => !recovery.getSnapshot().loading);
    assert.equal(recovery.getSnapshot().user.id, session.user.id);
    assert.match(recovery.getSnapshot().profileError, /login is kept/);
    assert.equal(client.signOuts, 0);
    client.getProfile = async () => ({ data: [profile], error: null });
    await recovery.retry();
    assert.deepEqual(recovery.getSnapshot().profile, profile);
    assert.equal(recovery.getSnapshot().profileError, '');
    assert.equal(client.signOuts, 0);
  } finally {
    recovery.dispose();
  }
});

test('a hung session restoration becomes retryable and never clears saved login', async () => {
  const client = mockClient();
  client.getSession = () => new Promise(() => {});
  const recovery = createAuthRecovery(client, () => {}, { timeoutMs: 10 });
  recovery.start();
  try {
    client.emit('INITIAL_SESSION', null);
    await until(() => !recovery.getSnapshot().loading);
    assert.match(recovery.getSnapshot().profileError, /saved login has not been cleared/);
    assert.equal(client.signOuts, 0);
    client.getSession = async () => ({ data: { session }, error: null });
    await recovery.retry();
    assert.equal(recovery.getSnapshot().profile.id, profile.id);
  } finally {
    recovery.dispose();
  }
});

test('timed-out profile requests are aborted and late responses cannot overwrite a retry', async () => {
  const client = mockClient();
  const pending = deferred();
  let requestSignal;
  client.getProfile = (signal) => {
    requestSignal = signal;
    return pending.promise;
  };
  const recovery = createAuthRecovery(client, () => {}, { timeoutMs: 10 });
  recovery.start();
  try {
    await until(() => !recovery.getSnapshot().loading);
    assert.equal(requestSignal.aborted, true);
    client.getProfile = async () => ({
      data: [{ ...profile, permissions: ['media'] }],
      error: null,
    });
    await recovery.retry();
    pending.resolve({ data: [{ ...profile, permissions: ['users'] }], error: null });
    await pause(0);
    assert.deepEqual(recovery.getSnapshot().profile.permissions, ['media']);
    assert.equal(client.signOuts, 0);
  } finally {
    recovery.dispose();
  }
});

test('a queued sign-in event cannot restore a user after a newer sign-out', async () => {
  const client = mockClient();
  client.getSession = () => new Promise(() => {});
  const recovery = createAuthRecovery(client, () => {}, { timeoutMs: 10 });
  recovery.start();
  try {
    assert.equal(client.emit('SIGNED_IN', session), undefined);
    client.emit('SIGNED_OUT', null);
    await pause(15);
    assert.equal(recovery.getSnapshot().user, null);
    assert.equal(recovery.getSnapshot().profile, null);
    assert.equal(recovery.getSnapshot().loading, false);
    assert.equal(client.profileCalls, 0);
  } finally {
    recovery.dispose();
  }
});

test('sign-out invalidates an in-flight profile, including when that request ignores abort', async () => {
  const client = mockClient();
  const pending = deferred();
  client.getProfile = () => pending.promise;
  const recovery = createAuthRecovery(client, () => {});
  recovery.start();
  try {
    await until(() => client.profileCalls === 1);
    await recovery.signOut();
    pending.resolve({ data: [profile], error: null });
    await pause(0);
    assert.equal(recovery.getSnapshot().user, null);
    assert.equal(recovery.getSnapshot().profile, null);
  } finally {
    recovery.dispose();
  }
});

test('token refresh updates credentials without remounting the authenticated capture page', async () => {
  const client = mockClient();
  const snapshots = [];
  const recovery = createAuthRecovery(client, (state) => snapshots.push(state));
  recovery.start();
  try {
    await until(() => !recovery.getSnapshot().loading);
    snapshots.length = 0;
    client.emit('TOKEN_REFRESHED', {
      ...session,
      user: { ...session.user, email: 'new@example.invalid' },
    });
    assert.equal(recovery.getSnapshot().user.email, 'new@example.invalid');
    assert.equal(client.profileCalls, 1);
    assert.ok(snapshots.every((state) => !state.loading && state.profile));
  } finally {
    recovery.dispose();
  }
});

test('explicit sign in obtains its profile once after the SDK notification returns', async () => {
  const client = mockClient();
  client.getSession = async () => ({ data: { session: null }, error: null });
  const recovery = createAuthRecovery(client, () => {});
  recovery.start();
  try {
    await until(() => !recovery.getSnapshot().loading);
    const data = await recovery.signIn(session.user.email, 'password');
    await pause(0);
    assert.deepEqual(data.profile, profile);
    assert.equal(client.profileCalls, 1);
  } finally {
    recovery.dispose();
  }
});

test('the installed Supabase SDK restores an expired tab session without an auth notification deadlock', async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  storage.setItem('sb-restore-test-auth-token', JSON.stringify({ ...session, expires_at: 1 }));
  const requests = [];
  const client = createClient('https://restore-test.supabase.co', 'test-anon-key', {
    auth: {
      ...createTabAuthOptions('https://restore-test.supabase.co', { sessionStorage: storage }),
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (address) => {
        requests.push(String(address));
        if (String(address).includes('/token?grant_type=refresh_token'))
          return new Response(JSON.stringify(session), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        assert.match(String(address), /\/rest\/v1\/rpc\/get_my_profile$/);
        return new Response(JSON.stringify([profile]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  });
  const recovery = createAuthRecovery(client, () => {}, { timeoutMs: 200 });
  recovery.start();
  try {
    await until(() => !recovery.getSnapshot().loading);
    assert.equal(recovery.getSnapshot().profileError, '');
    assert.deepEqual(recovery.getSnapshot().profile, profile);
    assert.ok(storage.getItem('sb-restore-test-auth-token'));
    assert.equal(requests.filter((url) => url.includes('/logout')).length, 0);
    assert.equal(requests.filter((url) => url.includes('/get_my_profile')).length, 1);
  } finally {
    recovery.dispose();
    await client.auth.stopAutoRefresh();
  }
});
