import { useLayoutEffect, useState } from 'react';
import { observePrayerDockScroll } from '@/lib/prayerDockScroll';

export function usePrayerDockVisibility(panelRef, routeKey, paused) {
  const [hidden, setHidden] = useState(false);
  useLayoutEffect(() => {
    setHidden(false);
    if (paused || !panelRef.current) return undefined;
    return observePrayerDockScroll({ panel: panelRef.current, onChange: setHidden });
  }, [panelRef, routeKey, paused]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (hidden) root.dataset.prayerDockHidden = 'true';
    else delete root.dataset.prayerDockHidden;
    return () => delete root.dataset.prayerDockHidden;
  }, [hidden]);

  return hidden;
}
