import { tvScene } from './tv.js';

// Discard the unused end of the uint32 range so every eight-digit code is equally likely.
export function createSessionCode(random = globalThis.crypto) {
  const range = 100000000;
  const limit = Math.floor(4294967296 / range) * range;
  const value = new Uint32Array(1);
  do random.getRandomValues(value); while (value[0] >= limit);
  return String(value[0] % range).padStart(8, '0');
}

export function isActivePresentation(presentation, settings, now = Date.now()) {
  return Boolean(
    presentation?.id &&
      tvScene(settings, now) === 'teaching' &&
      (!presentation.expires_at || Date.parse(presentation.expires_at) > now),
  );
}
