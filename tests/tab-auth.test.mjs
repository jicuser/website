import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createTabAuthOptions } from '../src/lib/tabAuthStorage.js';

const url = 'https://session-test.supabase.co';
const savedKey = 'sb-session-test-auth-token';
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const tab = (localStorage = storage()) => ({ sessionStorage: storage(), localStorage });

test('the installed Supabase client keeps login on reload, isolates new tabs and signs out locally', async () => {
  const requests = [];
  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'test-staff', email: 'staff@example.invalid' },
  };
  const fetch = async (address) => {
    requests.push(String(address));
    if (String(address).includes('/logout?scope=local')) return new Response(null, { status: 204 });
    assert.match(String(address), /\/token\?grant_type=password$/);
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const clients = [];
  function client(browser) {
    const instance = createClient(url, 'test-public-key', {
      auth: {
        ...createTabAuthOptions(url, browser),
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch },
    });
    clients.push(instance);
    return instance;
  }
  try {
    const originalTab = tab();
    const original = client(originalTab);
    const result = await original.auth.signInWithPassword({
      email: session.user.email,
      password: 'test',
    });
    assert.equal(result.error, null);
    assert.ok(originalTab.sessionStorage.getItem(savedKey));
    assert.equal(originalTab.localStorage.getItem(savedKey), null);

    // Reloading replaces the JS client, but keeps this tab's session storage.
    const reloaded = client(originalTab);
    assert.equal((await reloaded.auth.getSession()).data.session.user.id, session.user.id);
    // Opening a fresh tab after closing the original starts with empty tab storage.
    const fresh = client(tab(originalTab.localStorage));
    assert.equal((await fresh.auth.getSession()).data.session, null);

    assert.equal((await reloaded.auth.signOut({ scope: 'local' })).error, null);
    assert.equal(originalTab.sessionStorage.getItem(savedKey), null);
    assert.equal((await client(originalTab).auth.getSession()).data.session, null);
    assert.equal(requests.filter((address) => address.includes('/logout?scope=local')).length, 1);
  } finally {
    for (const instance of clients) await instance.auth.stopAutoRefresh();
  }
});

test('reloads have separate auth notification channels and preserve the login verifier', () => {
  const browser = tab();
  const first = createTabAuthOptions(url, browser);
  first.storage.setItem(`${first.storageKey}-code-verifier`, 'verifier');
  const next = createTabAuthOptions(url, browser);
  const anotherTab = createTabAuthOptions(url, tab(browser.localStorage));
  assert.notEqual(first.storageKey, next.storageKey);
  assert.notEqual(first.storageKey, anotherTab.storageKey);
  assert.equal(next.storage.getItem(`${next.storageKey}-code-verifier`), 'verifier');
  assert.equal(anotherTab.storage.getItem(`${anotherTab.storageKey}-code-verifier`), null);
  next.storage.removeItem(`${next.storageKey}-code-verifier`);
  assert.equal(browser.sessionStorage.getItem(`${savedKey}-code-verifier`), null);
});

test('blocked storage keeps credentials in memory without using persistent storage', () => {
  const denied = () => {
    throw new Error('Storage blocked');
  };
  for (const browser of [
    {
      get sessionStorage() {
        return denied();
      },
      get localStorage() {
        return denied();
      },
    },
    { sessionStorage: { getItem: denied, setItem: denied, removeItem: denied } },
  ]) {
    const options = createTabAuthOptions(url, browser);
    assert.equal(options.storage.getItem(options.storageKey), null);
    options.storage.setItem(options.storageKey, 'session');
    assert.equal(options.storage.getItem(options.storageKey), 'session');
    const reloaded = createTabAuthOptions(url, browser);
    assert.equal(reloaded.storage.getItem(reloaded.storageKey), null);
    options.storage.removeItem(options.storageKey);
    assert.equal(options.storage.getItem(options.storageKey), null);
  }
});

test('retiring persistent login preserves TV approval, drafts and other projects', () => {
  const browser = tab();
  const keptKeys = ['jic-tv-device', 'jic-tv-draft', 'jic-theme', 'sb-other-auth-token'];
  for (const key of [savedKey, `${savedKey}-code-verifier`, ...keptKeys]) {
    browser.localStorage.setItem(key, 'keep');
  }
  const options = createTabAuthOptions(url, browser);
  assert.equal(options.storage.getItem(options.storageKey), null);
  assert.equal(browser.localStorage.getItem(savedKey), null);
  assert.equal(browser.localStorage.getItem(`${savedKey}-code-verifier`), null);
  for (const key of keptKeys) assert.equal(browser.localStorage.getItem(key), 'keep');
});
