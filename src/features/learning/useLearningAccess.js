import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** Availability is server-owned. This never grants a capability or changes a release flag. */
export default function useLearningAccess(auth) {
  const id = auth?.user?.id;
  const active = auth?.profile?.is_active === true;
  const [state, setState] = useState({ id: null, enabled: false, loading: false });
  useEffect(() => {
    if (!id || !active) return undefined;
    let disposed = false;
    let controller;
    const read = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setState({ id, enabled: false, loading: true });
      const timeout = window.setTimeout(() => current.abort(), 8000);
      try {
        const { data, error } = await supabase
          .rpc('get_learning_access')
          .abortSignal(current.signal);
        if (!disposed && controller === current)
          setState({
            id,
            enabled: !error && !current.signal.aborted && data === true,
            loading: false,
          });
      } catch {
        if (!disposed && controller === current) setState({ id, enabled: false, loading: false });
      } finally {
        window.clearTimeout(timeout);
      }
    };
    read();
    return () => {
      disposed = true;
      controller?.abort();
    };
  }, [id, active, auth?.profile]);
  if (!id || !active) return { enabled: false, loading: false };
  return state.id === id ? state : { enabled: false, loading: true };
}
