import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { observePrayerDockScroll } from '@/lib/prayerDockScroll';

export function usePrayerDockVisibility(panelRef, routeKey, paused, quiet = false) {
  const [hidden, setHidden] = useState(false);
  const controller = useRef(null);
  useLayoutEffect(() => {
    if (paused || !panelRef.current) {
      setHidden(quiet);
      return undefined;
    }
    controller.current = observePrayerDockScroll({
      panel: panelRef.current,
      onChange: setHidden,
      quiet,
    });
    return () => {
      controller.current?.();
      controller.current = null;
    };
  }, [panelRef, routeKey, paused, quiet]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (hidden) root.dataset.prayerDockHidden = 'true';
    else delete root.dataset.prayerDockHidden;
    return () => delete root.dataset.prayerDockHidden;
  }, [hidden]);

  const toggle = useCallback(() => controller.current?.toggle(), []);
  return { hidden, toggle };
}
