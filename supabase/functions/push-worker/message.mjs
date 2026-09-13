const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The only lock-screen content is fixed copy; caller data cannot become a message. */
export function pushMessage(notification, token) {
  if (!uuid.test(notification.id) || !['task', 'learning', 'form'].includes(notification.kind)) {
    throw new Error('Invalid notification');
  }
  return {
    message: {
      token,
      notification: {
        title: 'New update',
        body: 'Open the app to view your update securely.',
      },
      data: { notification_id: notification.id, kind: notification.kind },
      android: { priority: 'normal', notification: { tag: notification.id } },
      apns: {
        headers: { 'apns-collapse-id': notification.id, 'apns-priority': '10' },
        payload: { aps: { sound: 'default' } },
      },
    },
  };
}

/** Compare fixed-size digests, so header length and string prefix do not leak the secret. */
export async function validWorkerSecret(authorization, secret) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof authorization !== 'string' || authorization.length > 4096) return false;
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(authorization)),
    crypto.subtle.digest('SHA-256', encoder.encode(`Bearer ${secret}`)),
  ]);
  const a = new Uint8Array(actual), b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}
