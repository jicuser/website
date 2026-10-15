import { cleanReminderSettings } from './salahReminderSettings.js';

const STORAGE_KEY = 'jic-salah-reminders-device';
export function reminderSupport(env) {
  const standalone = Boolean(
    env.navigator?.standalone || env.window?.matchMedia?.('(display-mode: standalone)').matches,
  );
  const ios =
    /iPhone|iPad|iPod/.test(env.navigator?.userAgent || '') ||
    (env.navigator?.platform === 'MacIntel' && env.navigator.maxTouchPoints > 1);
  if (ios && !standalone) return 'install';
  if (
    !env.window?.isSecureContext ||
    !env.navigator?.serviceWorker ||
    !env.window?.PushManager ||
    !env.Notification
  )
    return 'unsupported';
  if (env.Notification.permission === 'denied') return 'blocked';
  return 'supported';
}
export function createReminderApi({ url, key, fetcher = fetch }) {
  return async (action, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetcher(`${url}/functions/v1/salah-reminders`, {
        method: action === 'config' ? 'GET' : 'POST',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: { apikey: key, 'Content-Type': 'application/json' },
        ...(action === 'config' ? {} : { body: JSON.stringify({ ...body, action }) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update reminders. Please retry.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError')
        throw new Error('The reminder request timed out. Your change has not been confirmed.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}
export function createReminderClient(api, env) {
  const read = () => {
    try {
      const value = JSON.parse(env.storage.getItem(STORAGE_KEY) || 'null');
      return value && /^[a-f0-9]{64}$/.test(value.token) && /^[0-9a-f-]{36}$/.test(value.id)
        ? value
        : null;
    } catch {
      return null;
    }
  };
  const registration = async () => {
    const result = await env.navigator.serviceWorker.getRegistration('/');
    return result?.active?.scriptURL.endsWith('/salah-reminders-sw.js') ? result : null;
  };
  const inspect = async () => {
    const config = await api('config');
    const support = reminderSupport(env);
    const device = read();
    const saved = device ? await api('status', device) : null;
    const worker = support === 'supported' ? await registration() : null;
    const subscription = await worker?.pushManager.getSubscription();
    return {
      config,
      support,
      saved,
      active: Boolean(saved?.active && subscription && env.Notification.permission === 'granted'),
    };
  };
  return {
    inspect,
    async enable(preferences, config, expected) {
      const clean = cleanReminderSettings(preferences);
      if (reminderSupport(env) !== 'supported')
        throw new Error('Complete the phone setup shown below first.');
      if (!config?.ready || !config.publicKey)
        throw new Error('The reminder sender is not ready. Please retry later.');
      // Permission is requested directly from the enable click, before any network or registration await.
      const permission = await env.Notification.requestPermission();
      if (permission !== 'granted')
        throw new Error('Notifications were not allowed. No reminders have been enabled.');
      let device = read();
      const fresh = !device;
      if (!device) {
        device = {
          id: env.crypto.randomUUID(),
          token: [...env.crypto.getRandomValues(new Uint8Array(32))]
            .map((n) => n.toString(16).padStart(2, '0'))
            .join(''),
        };
        try {
          env.storage.setItem(STORAGE_KEY, JSON.stringify(device));
        } catch {
          throw new Error(
            'Allow website storage so this device can manage and turn off its reminders.',
          );
        }
      }
      await env.navigator.serviceWorker.register('/salah-reminders-sw.js', { scope: '/' });
      const worker = await env.navigator.serviceWorker.ready;
      let subscription = await worker.pushManager.getSubscription();
      if (fresh && subscription) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        const base64 = config.publicKey.replaceAll('-', '+').replaceAll('_', '/');
        const bytes = Uint8Array.from(
          env.atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)),
          (c) => c.charCodeAt(0),
        );
        subscription = await worker.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        });
      }
      return api('save', {
        ...device,
        subscription: subscription.toJSON(),
        preferences: clean,
        expected: expected || null,
      });
    },
    async disable() {
      const device = read();
      if (device) await api('remove', device);
      const worker = await registration();
      try {
        await (await worker?.pushManager.getSubscription())?.unsubscribe();
      } catch {
        /* Server removal already stops sending. */
      }
      try {
        env.storage.removeItem(STORAGE_KEY);
      } catch {
        /* A stale capability no longer has a server record. */
      }
    },
    async test() {
      const device = read();
      if (!device) throw new Error('Enable reminders first.');
      return api('test', device);
    },
  };
}
