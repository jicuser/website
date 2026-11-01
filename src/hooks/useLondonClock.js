import { useEffect, useState } from 'react';
import { londonClock } from '@/lib/prayerStatus';
export default function useLondonClock() {
  const [clock, setClock] = useState(() => londonClock());
  useEffect(() => {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      setClock(londonClock());
      timer = setTimeout(refresh, 60000 - (Date.now() % 60000) + 25);
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return clock;
}
