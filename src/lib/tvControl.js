import { supabase } from '@/lib/supabaseClient';
export { waitForIce } from './tvPeer';
export { TV_SCREENS, DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';

export async function tvRequest(action, screenId, values = {}, { staff = false, signal } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  if (staff) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Sign in to manage TV screens.');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(abort, 15000);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tv-control`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...values, action, screenId }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'TV controls are temporarily unavailable.');
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
export const deviceKey = (id) => `jic-tv-device-${id}`;
