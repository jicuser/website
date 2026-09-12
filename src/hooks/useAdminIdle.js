import { useCallback, useEffect, useRef, useState } from 'react';
import { adminActivityKey, hasActiveCapture, idleSecondsLeft } from '@/lib/adminActivity';

// Human activity is shared between tabs. API polling and token refreshes do not
// reset the idle clock. A live camera/screen counts as an ongoing admin action.
export default function useAdminIdle(userId, enabled, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const lastActivity = useRef(Date.now());
  const expire = useRef(onExpire);
  expire.current = onExpire;
  const staySignedIn = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(null);
    if (userId) {
      try {
        localStorage.setItem(adminActivityKey(userId), String(lastActivity.current));
      } catch {
        /* The in-memory timer still applies when storage is unavailable. */
      }
    }
  }, [userId]);
  useEffect(() => {
    if (!userId || !enabled) {
      setSecondsLeft(null);
      return;
    }
    let expired = false;
    try {
      const stored = Number(localStorage.getItem(adminActivityKey(userId)));
      lastActivity.current = stored > 0 && stored <= Date.now() ? stored : Date.now();
      if (!stored) localStorage.setItem(adminActivityKey(userId), String(lastActivity.current));
    } catch {
      lastActivity.current = Date.now();
    }
    const activity = () => {
      if (!expired && Date.now() - lastActivity.current >= 1000) staySignedIn();
    };
    const check = () => {
      if (expired) return;
      if (hasActiveCapture()) {
        staySignedIn();
        return;
      }
      try {
        const stored = Number(localStorage.getItem(adminActivityKey(userId)));
        if (stored > lastActivity.current && stored <= Date.now()) lastActivity.current = stored;
      } catch {
        /* Use the last activity seen by this tab. */
      }
      const remaining = idleSecondsLeft(lastActivity.current, Date.now());
      setSecondsLeft(remaining);
      if (remaining === 0) {
        expired = true;
        expire.current();
      }
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) =>
      window.addEventListener(event, activity, { passive: true, capture: true }),
    );
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, 5000);
    check();
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, activity, true));
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [userId, enabled, staySignedIn]);
  return { secondsLeft, staySignedIn };
}
