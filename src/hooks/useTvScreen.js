import { useEffect, useState } from 'react';
import { DEFAULT_TV_SETTINGS, TV_SCREENS, deviceKey, tvRequest } from '@/lib/tvControl';

export default function useTvScreen(screenId) {
  const [state, setState] = useState({
    settings: DEFAULT_TV_SETTINGS,
    inputs: [],
    paired: false,
    deviceToken: '',
    error: '',
  });
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let token = '';
    let pairError = '';
    let isPreview = false;
    async function poll() {
      try {
        const data = await tvRequest(
          'status',
          screenId,
          { deviceToken: token },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setState({ ...data, deviceToken: token, error: pairError });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 401) {
          token = '';
          try {
            if (!isPreview) localStorage.removeItem(deviceKey(screenId));
          } catch {
            /* Storage may be disabled. */
          }
        }
        // A failed authorisation/status check must not leave a private feed playing.
        setState((previous) => ({
          ...previous,
          settings: {
            ...previous.settings,
            scenes: DEFAULT_TV_SETTINGS.scenes,
            active_scene_id: 'scene-1',
          },
          inputs: [],
          paired: false,
          error: error.message,
        }));
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 8000);
    }
    async function start() {
      try {
        token = localStorage.getItem(deviceKey(screenId)) || '';
      } catch {
        /* Public posters still work. */
      }
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const previewToken = hash.get('preview');
      if (previewToken && /^[a-f0-9]{64}$/.test(previewToken)) {
        isPreview = true;
        token = previewToken;
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      const code = hash.get('pair');
      if (code) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        try {
          const result = await tvRequest('pair', screenId, { code }, { signal: controller.signal });
          token = result.deviceToken;
          try {
            localStorage.setItem(deviceKey(screenId), token);
          } catch {
            pairError = 'Pairing lasts until this page closes because browser storage is disabled.';
          }
        } catch (error) {
          pairError = error.message;
        }
      }
      if (!controller.signal.aborted) poll();
    }
    start();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [screenId, revision]);
  return { ...state, label: TV_SCREENS.find((item) => item.id === screenId)?.label, refresh };
}
