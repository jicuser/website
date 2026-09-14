import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const PublishedPagesContext = createContext([]);

// Public metadata only; one reader serves the poster links and section catalogue.
export function PublishedPagesProvider({ children }) {
  const [pages, setPages] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let reading = false;
    async function load() {
      if (reading || controller.signal.aborted) return;
      reading = true;
      clearTimeout(timer);
      try {
        const { data, error } = await supabase
          .rpc('list_site_pages')
          .abortSignal(controller.signal);
        if (!controller.signal.aborted) setPages(!error && Array.isArray(data) ? data : []);
      } catch {
        if (!controller.signal.aborted) setPages([]);
      } finally {
        reading = false;
        if (!controller.signal.aborted)
          timer = setTimeout(() => {
            if (document.visibilityState === 'visible') void load();
          }, 30000);
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    void load();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('content-workflow-updated', visible);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('content-workflow-updated', visible);
    };
  }, []);
  return <PublishedPagesContext.Provider value={pages}>{children}</PublishedPagesContext.Provider>;
}

export const usePublishedPages = () => useContext(PublishedPagesContext);
