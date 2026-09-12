const key = (hall, slot) => `jic-capture-lease:${hall}:${slot}`;

// A tab may restart its own abandoned capture after refresh. These IDs never
// grant access: the API still checks the signed-in operator's permissions.
export function readCaptureLease(hall, slot, storage) {
  try {
    return (storage ?? globalThis.sessionStorage)?.getItem(key(hall, slot)) || '';
  } catch {
    return '';
  }
}
export function saveCaptureLease(hall, slot, id, storage) {
  try {
    (storage ?? globalThis.sessionStorage)?.setItem(key(hall, slot), id);
  } catch {
    /* Explicit Stop still works. */
  }
}
export function clearCaptureLease(hall, slot, id, storage) {
  try {
    if (readCaptureLease(hall, slot, storage) === id)
      (storage ?? globalThis.sessionStorage)?.removeItem(key(hall, slot));
  } catch {
    /* The server also expires abandoned captures. */
  }
}

export async function releaseOwnCaptureLease(hall, slot, stopSession, storage) {
  const previous = readCaptureLease(hall, slot, storage);
  if (!previous) return;
  await stopSession(previous);
  clearCaptureLease(hall, slot, previous, storage);
}
