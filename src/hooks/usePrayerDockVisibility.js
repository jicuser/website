import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { observePrayerDockScroll } from '@/lib/prayerDockScroll';

export function usePrayerDockVisibility(panelRef, routeKey, paused) {
  const [hidden, setHidden] = useState(false);
  const controller = useRef(null);
  useLayoutEffect(() => {
    setHidden(false);
    if (paused || !panelRef.current) return undefined;
    controller.current = observePrayerDockScroll({ panel: panelRef.current, onChange: setHidden });
    return () => {
      controller.current?.();
      controller.current = null;
    };
  }, [panelRef, routeKey, paused]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (hidden) root.dataset.prayerDockHidden = 'true';
    else delete root.dataset.prayerDockHidden;
    return () => delete root.dataset.prayerDockHidden;
  }, [hidden]);

  const toggle = useCallback(() => controller.current?.toggle(), []);
  return { hidden, toggle };
}
