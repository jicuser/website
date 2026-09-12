import { DEFAULT_TV_SETTINGS, publicSettings } from '../../supabase/functions/_shared/tv.js';

export const validDeviceToken = (token) =>
  typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export function createDisplayToken(random = globalThis.crypto) {
  const bytes = random.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function readDisplayIdentity(storage, key, create = createDisplayToken) {
  try {
    const saved = storage.getItem(key);
    if (validDeviceToken(saved)) return saved;
  } catch {
    // A restricted browser can use the same in-memory identity until the page closes.
  }
  const token = create();
  try {
    storage.setItem(key, token);
  } catch {
    // Saving an identity is optional; approving this open webpage still works.
  }
  return token;
}

export function readDisplayLink(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (validDeviceToken(params.get('preview'))) return { previewToken: params.get('preview') };
  if (!params.has('watch')) return null;
  const code = params.get('watch');
  const presentationId = params.get('session');
  if (
    !/^\d{8}$/.test(code || '') ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(presentationId || '')
  )
    return { error: 'This stream link is incomplete. Ask the organiser for a new link.' };
  return { code, presentationId };
}

export function displayCodeRemaining(expiresAt, now = Date.now()) {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.ceil((expires - now) / 1000));
}

export function initialDisplayState() {
  return {
    settings: DEFAULT_TV_SETTINGS,
    inputs: [],
    paired: false,
    displayMode: null,
    presentationId: null,
    deviceToken: '',
    status: 'loading',
    error: '',
  };
}

export function receivedDisplayState(data, token) {
  if (!['normal', 'teaching'].includes(data?.displayMode))
    throw new Error('Unable to confirm the current hall stream. Retrying…');
  const paired = data.paired === true && validDeviceToken(token);
  return {
    ...data,
    settings: publicSettings(data.settings, paired),
    inputs: paired ? data.inputs || [] : [],
    paired,
    deviceToken: paired ? token : '',
    status: 'ready',
    error: '',
  };
}

// Stop private playback on a failed access check; keep the identity ready for a retry.
export function interruptedDisplayState(previous, message) {
  return {
    ...previous,
    settings: publicSettings(previous.settings),
    inputs: [],
    paired: false,
    status: 'error',
    error: message || 'The hall stream is temporarily unavailable.',
  };
}
