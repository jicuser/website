// Broadcasts are hints only. The status endpoint decides what this display may show.
export function subscribeDisplayRefresh(client, screenId, refresh) {
  let closed = false;
  let timer;
  let lastRefresh = 0;
  const request = () => {
    if (closed || timer) return;
    const delay = Math.max(0, 1000 - (Date.now() - lastRefresh));
    timer = setTimeout(() => {
      timer = null;
      if (closed) return;
      lastRefresh = Date.now();
      refresh();
    }, delay);
  };
  const channel = client
    .channel(`display-state:${screenId}`)
    .on('broadcast', { event: 'refresh' }, request)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') request();
    });
  return () => {
    closed = true;
    clearTimeout(timer);
    Promise.resolve(client.removeChannel(channel)).catch(() => {});
  };
}
