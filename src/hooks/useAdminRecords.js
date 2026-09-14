import { useCallback, useEffect, useRef, useState } from 'react';

// One in-flight read. Editing drafts are separate from refreshed server records.
export default function useAdminRecords(read, interval = 15000) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const refresh = useRef(() => {});
  const reload = useCallback(() => refresh.current(), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer, running = false, requested = false;
    const load = async () => {
      if (controller.signal.aborted) return;
      if (running) { requested = true; return; }
      running = true;
      clearTimeout(timer);
      setState(current => ({ ...current, loading: true }));
      try {
        const data = await read(controller.signal);
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message || 'Could not load this information. Please retry.' });
      } finally {
        running = false;
        if (!controller.signal.aborted) {
          if (requested) { requested = false; void load(); }
          else if (interval) timer = setTimeout(() => { if (document.visibilityState === 'visible') void load(); }, interval);
        }
      }
    };
    refresh.current = load;
    setState({ data: null, loading: true, error: '' });
    void load();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('content-workflow-updated', load);
    return () => {
      controller.abort(); clearTimeout(timer); refresh.current = () => {};
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('content-workflow-updated', load);
    };
  }, [read, interval]);
  return { ...state, reload };
}
