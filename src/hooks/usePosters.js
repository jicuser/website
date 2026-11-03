import { useEffect, useMemo, useState } from 'react';
import { useContent } from '@/context/ContentContext';
import { POSTERS_KEY, posterCatalogue } from '@/lib/posters';
import { createRecordLoader } from '@/lib/recordLoader';
import { supabase } from '@/lib/supabaseClient';
export { POSTERS_KEY, posterImage } from '@/lib/posters';

// One published catalogue powers website pages, both TV modes and every picker.
export default function usePosters({ refreshPublicFeed = false } = {}) {
  const { getContent } = useContent();
  const raw = getContent(POSTERS_KEY, null);
  const [lastRead, setLastRead] = useState(null);
  useEffect(() => {
    // The editor preview owns its draft. Public feeds follow the published catalogue.
    if (
      !refreshPublicFeed ||
      (window.parent !== window &&
        new URLSearchParams(window.location.search).get('preview') === '1')
    )
      return;
    const visible = () => document.visibilityState === 'visible';
    const reader = createRecordLoader(
      async (signal) => {
        const { data, error } = await supabase
          .from('page_content')
          .select('content_value')
          .eq('content_key', POSTERS_KEY)
          .maybeSingle()
          .abortSignal(signal);
        if (error) throw error;
        return data?.content_value ?? null;
      },
      ({ data, loading, error }) => {
        if (!loading && !error) setLastRead({ baseline: raw, value: data });
      },
      { interval: 30000, isVisible: visible },
    );
    const refresh = () => {
      if (visible()) {
        window.clearTimeout(first);
        void reader.refresh();
      }
    };
    const restore = (event) => {
      if (event.persisted) refresh();
    };
    // ContentProvider has already loaded the first view.
    const first = window.setTimeout(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('pageshow', restore);
    return () => {
      reader.dispose();
      window.clearTimeout(first);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('pageshow', restore);
    };
  }, [refreshPublicFeed, raw]);
  const value = refreshPublicFeed && lastRead && lastRead.baseline === raw ? lastRead.value : raw;
  return useMemo(() => posterCatalogue(value), [value]);
}
