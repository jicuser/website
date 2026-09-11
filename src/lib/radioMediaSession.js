export function updateRadioMediaSession(audio) {
  if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
  navigator.mediaSession.metadata = new window.MediaMetadata({
    title: 'JIC Radio', artist: 'Jamatia Islamic Centre', album: 'Woodlands Road Masjid',
    artwork: [192, 512].map(size => ({ src: new URL(`/icons/jic-icon-${size}.png?v=stone-glass-1`, window.location.origin).href, sizes: `${size}x${size}`, type: 'image/png' })),
  });
  navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  try {
    navigator.mediaSession.setActionHandler('play', () => { audio.play().catch(() => {}); });
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('stop', () => audio.pause());
  } catch { /* Older browsers may not support all media actions. */ }
}

export function clearRadioMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';
  for (const action of ['play', 'pause', 'stop']) {
    try { navigator.mediaSession.setActionHandler(action, null); } catch { /* Unsupported action. */ }
  }
}
