import { useEffect, useState } from 'react';

// A separate, silent probe measures the stream, never the listener's controls.
export function useRadioAvailability(streamUrl) {
  const [availability, setAvailability] = useState('checking');
  useEffect(() => {
    let disposed = false, active = null, timer = null;
    setAvailability(streamUrl ? 'checking' : 'offline');
    if (!streamUrl) return undefined;
    const probe = () => {
      if (active || disposed) return;
      if (!navigator.onLine) { setAvailability('unknown'); return; }
      const audio = new Audio();
      active = audio;
      audio.muted = true;
      audio.preload = 'auto';
      const finish = status => {
        clearTimeout(timer);
        audio.onloadeddata = null;
        audio.onerror = null;
        audio.removeAttribute('src');
        audio.load();
        active = null;
        if (!disposed) setAvailability(status);
      };
      audio.onloadeddata = () => finish('online');
      audio.onerror = () => finish(navigator.onLine ? 'offline' : 'unknown');
      // Some mobile browsers block preloading. Do not label that as offline.
      timer = setTimeout(() => finish('unknown'), 12000);
      audio.src = streamUrl;
      audio.load();
    };
    probe();
    const interval = setInterval(probe, 45000);
    window.addEventListener('online', probe);
    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener('online', probe);
      if (active) {
        active.onloadeddata = null;
        active.onerror = null;
        active.removeAttribute('src');
        active.load();
      }
    };
  }, [streamUrl]);
  return availability;
}
