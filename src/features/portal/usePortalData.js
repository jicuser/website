import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { emptyPortalData, loadPortalData } from './model';

export default function usePortalData() {
  const [data, setData] = useState(emptyPortalData);
  const [failures, setFailures] = useState([]);
  const [busy, setBusy] = useState(true);
  const pending = useRef(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    const result = await loadPortalData(supabase, controller.signal);
    if (controller.signal.aborted || pending.current !== controller) return;
    setData(result.data);
    setFailures(result.failures);
    setBusy(false);
  }, []);
  useEffect(() => {
    reload();
    return () => pending.current?.abort();
  }, [reload]);
  return { data, failures, busy, reload };
}
