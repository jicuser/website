export const displayChanges = new Set([
  'normal', 'save', 'save-background', 'new-presentation', 'approve-display',
  'revoke', 'start', 'stop', 'join-session',
]);

export async function broadcastDisplayRefresh(baseUrl, key, screenId, send = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await send(`${baseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ topic: `display-state:${screenId}`, event: 'refresh', payload: {} }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Display refresh failed (${response.status}).`);
  } finally {
    clearTimeout(timer);
  }
}
