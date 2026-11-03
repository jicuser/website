import { useEffect, useState } from 'react';

/** Local display clock only. Timetable fetching stays in PrayerTimesContext. */
export default function useDisplayClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    function refresh() {
      window.clearInterval(timer);
      setNow(new Date());
      if (document.visibilityState !== 'hidden') {
        timer = window.setInterval(() => setNow(new Date()), 1000);
      }
    }
    refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return now;
}
