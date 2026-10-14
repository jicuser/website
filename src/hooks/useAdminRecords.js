import { useCallback, useEffect, useRef, useState } from 'react';
import { createRecordLoader } from '@/lib/recordLoader';

// One in-flight read. Editing drafts are separate from refreshed server records.
export default function useAdminRecords(read, interval = 15000) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const refresh = useRef(() => {});
  const reload = useCallback(() => refresh.current(), []);
  useEffect(() => {
    const reader = createRecordLoader(read, setState, {
      interval,
      isVisible: () => document.visibilityState === 'visible',
    });
    const load = reader.refresh;
    refresh.current = load;
    setState({ data: null, loading: true, error: '' });
    void load();
    const visible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('content-workflow-updated', load);
    return () => {
      reader.dispose();
      refresh.current = () => {};
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('content-workflow-updated', load);
    };
  }, [read, interval]);
  return { ...state, reload };
}
