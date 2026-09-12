import { supabase } from '@/lib/supabaseClient';
import { withRequestTimeout } from './requestTimeout';
export { waitForIce } from './tvPeer';
export { TV_SCREENS, DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';

export async function tvRequest(action, screenId, values = {}, { staff = false, signal } = {}) {
  return withRequestTimeout(
    async (requestSignal) => {
      const headers = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      };
      if (staff) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (requestSignal.aborted) throw requestSignal.reason;
        if (sessionError)
          throw new Error('Could not check your login. Your login is kept; retry the connection.');
        if (!data.session) {
          const error = new Error(
            'Your login has ended. Sign in again to manage this hall stream.',
          );
          error.status = 401;
          throw error;
        }
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tv-control`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...values, action, screenId }),
        signal: requestSignal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        const error = new Error(
          'The hall stream returned an unreadable response. Retry the connection.',
        );
        error.status = response.status;
        throw error;
      }
      if (!response.ok) {
        const error = new Error(
          data.error || 'Stream controls are temporarily unavailable. Retry the connection.',
        );
        error.status = response.status;
        throw error;
      }
      return data;
    },
    {
      signal,
      message: 'The hall stream connection timed out. Check your internet connection and retry.',
    },
  );
}
export const deviceKey = (id) => `jic-tv-device-${id}`;
