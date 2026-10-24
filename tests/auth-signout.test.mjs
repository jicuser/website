import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { createAuthRecovery } from '../src/lib/authRecovery.js';
import { createTabAuthOptions } from '../src/lib/tabAuthStorage.js';

const storageKey = 'sb-signout-test-auth-token';
const session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'staff-1', email: 'staff@example.invalid' },
};
const profile = { id: 'staff-1', is_active: true, permissions: ['tv'] };
const response = (status) =>
  new Response(status === 204 ? null : JSON.stringify({ message: 'Request unavailable' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function until(condition) {
  const end = Date.now() + 1000;
  while (!condition()) {
    if (Date.now() > end) throw new Error('Auth did not settle.');
    await pause(1);
  }
}

function fixture(logout, timeoutMs = 100) {
  const values = new Map([[storageKey, JSON.stringify(session)]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  let attempts = 0;
  const create = () =>
    createClient('https://signout-test.supabase.co', 'test-anon-key', {
      auth: {
        ...createTabAuthOptions('https://signout-test.supabase.co', { sessionStorage: storage }),
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (address) => {
          if (String(address).includes('/logout')) {
            assert.match(String(address), /\/logout\?scope=local$/);
            return logout(++attempts);
          }
          assert.match(String(address), /\/rest\/v1\/rpc\/get_my_profile$/);
          return new Response(JSON.stringify([profile]), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    });
  const client = create();
  const recovery = createAuthRecovery(client, () => {}, { timeoutMs });
  return {
    client,
    recovery,
    storage,
    attempts: () => attempts,
    async restoredSession() {
      const fresh = create();
      try {
        return (await fresh.auth.getSession()).data.session;
      } finally {
        await fresh.auth.stopAutoRefresh();
      }
    },
    async close() {
      recovery.dispose();
      await client.auth.stopAutoRefresh();
    },
  };
}

test('the installed SDK retries a settled temporary logout error once and clears the stored tab login', async () => {
  const f = fixture((attempt) => response(attempt === 1 ? 503 : 204));
  f.recovery.start();
  try {
    await until(() => !f.recovery.getSnapshot().loading);
    await f.recovery.signOut();
    assert.equal(f.attempts(), 2);
    assert.equal(f.storage.getItem(storageKey), null);
    assert.equal(f.recovery.getSnapshot().user, null);
    assert.equal(f.recovery.getSnapshot().profile, null);
    assert.equal(await f.restoredSession(), null);
  } finally {
    await f.close();
  }
});

for (const failure of ['offline', 'unavailable']) {
  test(`a settled ${failure} logout failure keeps the real session and can be retried explicitly`, async (t) => {
    if (failure === 'offline') t.mock.method(console, 'error', () => {});
    let available = false;
    const f = fixture(() => {
      if (available) return response(204);
      if (failure === 'offline') throw new TypeError('Offline');
      return response(503);
    });
    f.recovery.start();
    try {
      await until(() => !f.recovery.getSnapshot().loading);
      await assert.rejects(f.recovery.signOut());
      assert.equal(f.attempts(), 2);
      assert.ok(f.storage.getItem(storageKey));
      assert.equal(f.recovery.getSnapshot().user.id, session.user.id);
      assert.deepEqual(f.recovery.getSnapshot().profile, profile);
      assert.equal((await f.restoredSession()).user.id, session.user.id);
      available = true;
      await f.recovery.signOut();
      assert.equal(f.attempts(), 3);
      assert.equal(f.storage.getItem(storageKey), null);
      assert.equal(await f.restoredSession(), null);
    } finally {
      await f.close();
    }
  });
}

test('an already-expired logout token is cleared by the installed SDK without retrying', async () => {
  const f = fixture(() => response(401));
  f.recovery.start();
  try {
    await until(() => !f.recovery.getSnapshot().loading);
    await f.recovery.signOut();
    assert.equal(f.attempts(), 1);
    assert.equal(f.storage.getItem(storageKey), null);
    assert.equal(await f.restoredSession(), null);
  } finally {
    await f.close();
  }
});

test('a non-retryable logout rejection keeps the stored login and is not retried', async () => {
  const f = fixture(() => response(400));
  f.recovery.start();
  try {
    await until(() => !f.recovery.getSnapshot().loading);
    await assert.rejects(f.recovery.signOut());
    assert.equal(f.attempts(), 1);
    assert.ok(f.storage.getItem(storageKey));
    assert.equal(f.recovery.getSnapshot().user.id, session.user.id);
  } finally {
    await f.close();
  }
});

test('an unresolved logout timeout starts no retry and never clears UI auth ahead of stored credentials', async () => {
  let finish;
  const pending = new Promise((resolve) => (finish = resolve));
  const f = fixture(() => pending, 15);
  f.recovery.start();
  try {
    await until(() => !f.recovery.getSnapshot().loading);
    const signingOut = f.recovery.signOut();
    await assert.rejects(f.recovery.signOut(), /still waiting/);
    await assert.rejects(signingOut, { name: 'TimeoutError' });
    assert.equal(f.attempts(), 1);
    assert.ok(f.storage.getItem(storageKey));
    assert.equal(f.recovery.getSnapshot().user.id, session.user.id);
    await assert.rejects(f.recovery.signOut(), /still waiting/);
    await assert.rejects(f.recovery.signIn(session.user.email, 'password'), /still waiting/);
    assert.equal(f.attempts(), 1);
    // A late SDK success may still finish. Its real SIGNED_OUT event clears the UI.
    finish(response(204));
    await until(() => f.recovery.getSnapshot().user === null);
    assert.equal(f.storage.getItem(storageKey), null);
    assert.equal(f.recovery.getSnapshot().profile, null);
  } finally {
    await f.close();
  }
});
