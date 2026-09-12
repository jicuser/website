import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { trackActiveCapture } from '@/lib/adminActivity';

export default function useBroadcast(screenId) {
  const current = useRef(null);
  const mounted = useRef(true);
  const [state, setState] = useState({ live: false, busy: false, message: '' });
  const update = (next) => {
    if (mounted.current) setState(next);
  };
  async function request(path, options = {}) {
    const relay = new URL(import.meta.env.VITE_MEDIA_RELAY_URL);
    if (relay.protocol !== 'https:') throw new Error('The media relay must use HTTPS.');
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Sign in again.');
    const response = await fetch(new URL(path, relay), {
      ...options,
      signal: AbortSignal.timeout(15000),
      headers: { ...options.headers, Authorization: `Bearer ${data.session.access_token}` },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Broadcast connection failed.');
    return result;
  }
  async function stop(message = 'Broadcast stopped.') {
    const active = current.current;
    current.current = null;
    if (!active) return;
    clearInterval(active.health);
    if (active.recorder && active.recorder.state !== 'inactive') active.recorder.stop();
    active.stream?.getTracks().forEach((t) => t.stop());
    active.releaseActivity?.();
    if (active.id) await request(`/sessions/${active.id}`, { method: 'DELETE' }).catch(() => {});
    update({ live: false, busy: false, message });
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, []);
  async function start(destinations) {
    if (current.current) return false;
    const active = { id: '', stream: null, recorder: null, health: null };
    current.current = active;
    update({ live: false, busy: true, message: 'Choose the TV tab and include its audio.' });
    try {
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus'))
        throw new Error('Use desktop Chrome or Edge to broadcast the TV tab.');
      active.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } },
        audio: true,
      });
      if (current.current !== active) {
        active.stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      active.releaseActivity = trackActiveCapture(active.stream);
      const started = await request('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenId, destinations }),
      });
      active.id = started.id;
      if (current.current !== active) {
        await request(`/sessions/${active.id}`, { method: 'DELETE' }).catch(() => {});
        return false;
      }
      const recorder = new MediaRecorder(active.stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000,
      });
      active.recorder = recorder;
      let sequence = 0,
        pending = 0,
        queue = Promise.resolve();
      recorder.ondataavailable = (e) => {
        if (!e.data.size || current.current !== active) return;
        pending += e.data.size;
        if (pending > 32 * 1024 * 1024) {
          stop('Network too slow. Broadcast stopped.');
          return;
        }
        const number = sequence++;
        queue = queue
          .then(async () => {
            if (current.current === active)
              await request(`/sessions/${active.id}/chunks/${number}`, {
                method: 'POST',
                headers: { 'Content-Type': 'video/webm' },
                body: e.data,
              });
          })
          .then(() => {
            pending -= e.data.size;
          })
          .catch((error) => stop(error.message));
      };
      recorder.onerror = () => stop('Capture failed. Broadcast stopped.');
      active.stream
        .getVideoTracks()
        .forEach((track) => track.addEventListener('ended', () => stop(), { once: true }));
      recorder.start(1000);
      active.health = setInterval(
        () =>
          request(`/sessions/${active.id}`, { method: 'GET' })
            .then((result) => {
              if (result.status !== 'live')
                stop('The destination stopped accepting the broadcast.');
            })
            .catch((error) => stop(error.message)),
        5000,
      );
      update({
        live: true,
        busy: false,
        message:
          'Sending to the relay. Check Live Studio to confirm the platform is receiving video. Keep this tab open.',
      });
      return true;
    } catch (error) {
      await stop(error.name === 'NotAllowedError' ? 'Broadcast cancelled.' : error.message);
      return false;
    }
  }
  return { ...state, start, stop };
}
