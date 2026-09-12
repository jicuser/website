/** Keep staff login for the current tab, including reloads and website navigation. */
export function createTabAuthOptions(supabaseUrl, browser = globalThis) {
  const project = new URL(supabaseUrl).hostname.split('.')[0];
  const savedKey = `sb-${project}-auth-token`;
  // Supabase also uses storageKey for BroadcastChannel. Give each running client
  // its own channel so another tab cannot announce a session this tab does not own.
  const clientId = browser.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const storageKey = `${savedKey}-tab-${clientId}`;
  const memory = new Map();
  let tabStorage;
  try {
    tabStorage = browser.sessionStorage;
  } catch {
    // Restricted browsers can still sign in, but only until this page reloads.
  }

  try {
    // Retire the old persistent login without touching TV approvals or drafts.
    browser.localStorage?.removeItem(savedKey);
    browser.localStorage?.removeItem(`${savedKey}-code-verifier`);
  } catch {
    // The client never reads localStorage, even when its cleanup is blocked.
  }

  function savedStorageKey(key) {
    return key === storageKey || key.startsWith(`${storageKey}-`)
      ? savedKey + key.slice(storageKey.length)
      : key;
  }

  return {
    persistSession: true,
    storageKey,
    storage: {
      getItem(key) {
        const saved = savedStorageKey(key);
        if (tabStorage) {
          try {
            const value = tabStorage.getItem(saved);
            if (value === null) memory.delete(saved);
            else memory.set(saved, value);
            return value;
          } catch {
            tabStorage = null;
          }
        }
        return memory.get(saved) ?? null;
      },
      setItem(key, value) {
        const saved = savedStorageKey(key);
        memory.set(saved, value);
        try {
          tabStorage?.setItem(saved, value);
        } catch {
          tabStorage = null;
        }
      },
      removeItem(key) {
        const saved = savedStorageKey(key);
        memory.delete(saved);
        try {
          tabStorage?.removeItem(saved);
        } catch {
          tabStorage = null;
        }
      },
    },
  };
}
