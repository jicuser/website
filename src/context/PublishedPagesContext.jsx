import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const PublishedPagesContext = createContext([]);
const PublishedPagesStatusContext = createContext({ loading: true, error: false });

// Public metadata only; one reader serves the poster links and section catalogue.
export function PublishedPagesProvider({ children }) {
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: false });
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
        if (error) throw error;
        if (!controller.signal.aborted) {
          setPages(Array.isArray(data) ? data : []);
          setStatus({ loading: false, error: false });
        }
      } catch {
        if (!controller.signal.aborted) setStatus({ loading: false, error: true });
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
  return (
    <PublishedPagesStatusContext.Provider value={status}>
      <PublishedPagesContext.Provider value={pages}>{children}</PublishedPagesContext.Provider>
    </PublishedPagesStatusContext.Provider>
  );
}

export const usePublishedPages = () => useContext(PublishedPagesContext);
export const usePublishedPagesStatus = () => useContext(PublishedPagesStatusContext);
