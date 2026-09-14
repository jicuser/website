import { useCallback, useEffect, useState } from 'react';

// Only mounted admin views refresh. Background updates never replace an editor draft.
export default function useWorkflowData(load) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true,
      pending = false;
    setData(null);
    const run = async () => {
      if (pending) return;
      pending = true;
      setLoading(true);
      try {
        const next = await load();
        if (active) {
          setData(next);
          setError('');
        }
      } catch {
        if (active) {
          setData(null);
          setError('This information could not be loaded. Please retry.');
        }
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    const visible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    void run();
    const timer = setInterval(visible, 30000);
    window.addEventListener('content-workflow-updated', visible);
    window.addEventListener('focus', visible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('content-workflow-updated', visible);
      window.removeEventListener('focus', visible);
    };
  }, [load, revision]);
  return { data, loading, error, refresh };
}
