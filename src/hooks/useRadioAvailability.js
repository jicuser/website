import { useEffect, useState } from 'react';

// Read broadcast metadata without loading audio or changing the listener's controls.
export function useRadioAvailability(streamUrl) {
  const [availability, setAvailability] = useState('checking');
  useEffect(() => {
    let disposed = false,
      active = null,
      timer = null;
    setAvailability(streamUrl ? 'checking' : 'offline');
    if (!streamUrl) return undefined;
    const probe = async () => {
      if (active || disposed) return;
      if (!navigator.onLine) {
        setAvailability('unknown');
        return;
      }
      const controller = new AbortController();
      active = controller;
      timer = setTimeout(() => controller.abort(), 8000);
      try {
        const { checkRadioBroadcast } = await import('@/lib/radioAvailability');
        const status = await checkRadioBroadcast(streamUrl, controller.signal);
        if (!disposed && !controller.signal.aborted) setAvailability(status);
      } catch {
        if (!disposed) setAvailability('unknown');
      } finally {
        clearTimeout(timer);
        active = null;
      }
    };
    const offline = () => {
      active?.abort();
      setAvailability('unknown');
    };
    const restore = () => {
      if (!document.hidden) probe();
    };
    probe();
    const interval = setInterval(probe, 45000);
    window.addEventListener('online', probe);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', restore);
    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener('online', probe);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', restore);
      active?.abort();
    };
  }, [streamUrl]);
  return availability;
}
