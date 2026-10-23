/** A connected Icecast server may be playing a holding track rather than a broadcast. */
export function broadcastAvailability(data) {
  if (!data?.icestats || typeof data.icestats !== 'object') return 'unknown';
  const source = data.icestats.source;
  if (!source) return 'offline';
  const sources = Array.isArray(source) ? source : [source];
  return sources.some((item) => {
    if (!item || typeof item !== 'object') return false;
    let mount;
    try {
      mount = new URL(item.listenurl).pathname;
    } catch {
      return false;
    }
    if (/\/(autodj|fallback|offline)\/?$/i.test(mount)) return false;
    if (/\b(not[\s_-]*live|off[\s_-]*air|offline|no[\s_-]*broadcast)\b/i.test(item.title || ''))
      return false;
    return (
      /^audio\//i.test(item.server_type || '') &&
      Boolean(
        item.stream_start_iso8601 ||
        item.stream_start ||
        item.audio_info ||
        Number(item.bitrate) > 0,
      )
    );
  })
    ? 'online'
    : 'offline';
}

export async function checkRadioBroadcast(streamUrl, signal) {
  const url = new URL('/status-json.xsl', streamUrl);
  if (url.protocol !== 'https:') return 'unknown';
  const response = await fetch(url, {
    signal,
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
  });
  if (!response.ok) return 'unknown';
  return broadcastAvailability(await response.json());
}
