import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function useRamadanCalendar(autoRefresh = false) {
  const [state, setState] = useState({ data: null, loading: true, error: '' }),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setState((current) => ({ ...current, loading: true, error: '' }));
    supabase
      .rpc('ramadan_calendar_public')
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setState({ data, loading: false, error: '' });
      })
      .catch(() => {
        if (active)
          setState((current) => ({
            ...current,
            loading: false,
            error: 'Could not load the Ramadan calendar. Please try again.',
          }));
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [revision]);
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(refresh, 60000);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);
  return { ...state, refresh };
}
