export const ADMIN_IDLE_MS = 15 * 60 * 1000;
export const ADMIN_IDLE_WARNING_MS = 60 * 1000;
export const adminActivityKey = (userId) => `jic-admin-activity:${userId}`;

const captures = new Set();
export function trackActiveCapture(stream) {
  captures.add(stream);
  return () => captures.delete(stream);
}
export function hasActiveCapture() {
  for (const stream of captures) {
    if (stream.getVideoTracks().some((track) => track.readyState === 'live')) return true;
    captures.delete(stream);
  }
  return false;
}
export function idleSecondsLeft(lastActivity, now, sharing = false) {
  if (sharing) return null;
  const remaining = ADMIN_IDLE_MS - Math.max(0, now - lastActivity);
  if (remaining > ADMIN_IDLE_WARNING_MS) return null;
  return Math.max(0, Math.ceil(remaining / 1000));
}
