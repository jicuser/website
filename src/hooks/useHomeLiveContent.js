import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { londonDate } from '@/lib/timetable';

/** The website and TV read the same published events and livestream settings. */
export default function useHomeLiveContent({ eventLimit = 4, refreshMs = 60000 } = {}) {
  const [content, setContent] = useState({ events:[], announcement:null, livestream:null, loading:true, stale:false });
  useEffect(() => {
    let active = true;
    let busy = false;
    let request;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      request = new AbortController();
      const timeout = window.setTimeout(() => request.abort(), 25000);
      const now = new Date().toISOString();
      try {
        const [events, announcements, livestream] = await Promise.all([
          supabase.from('events').select('*').eq('published',true).gte('event_date',londonDate()).order('event_date',{ascending:true}).limit(eventLimit).abortSignal(request.signal),
          supabase.from('announcements').select('*').eq('published',true).lte('starts_at',now).order('created_at',{ascending:false}).limit(6).abortSignal(request.signal),
          supabase.from('livestream_settings').select('*').eq('id',1).maybeSingle().abortSignal(request.signal),
        ]);
        if (active) setContent(previous => ({
          events:events.error ? previous.events : events.data || [],
          announcement:announcements.error ? previous.announcement : (announcements.data || []).find(item => !item.expires_at || item.expires_at > now) || null,
          livestream:livestream.error ? previous.livestream : livestream.data || null,
          loading:false,
          stale:Boolean(events.error || announcements.error || livestream.error),
        }));
      } catch {
        if (active) setContent(previous => ({ ...previous, loading:false, stale:true }));
      } finally { window.clearTimeout(timeout); busy = false; }
    };
    refresh();
    const timer = window.setInterval(refresh, refreshMs);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('jic-content-updated', refresh);
    return () => {
      active = false;
      request?.abort();
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('jic-content-updated', refresh);
    };
  }, [eventLimit, refreshMs]);
  return content;
}
