import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
const Context = createContext({ pages: [], loading: true, error: '' });
export function ContentPagesProvider({ children }) {
  const [state, setState] = useState({ pages: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.rpc('list_content_pages');
      if (active)
        setState({
          pages: Array.isArray(data) ? data : [],
          loading: false,
          error: error ? 'Page information could not be loaded.' : '',
        });
    };
    const refresh = () =>
      load().catch(
        () =>
          active &&
          setState({ pages: [], loading: false, error: 'Page information could not be loaded.' }),
      );
    void refresh();
    window.addEventListener('content-workflow-updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('content-workflow-updated', refresh);
    };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useContentPages = () => useContext(Context);
