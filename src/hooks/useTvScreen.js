import { useCallback, useEffect, useRef, useState } from 'react';
import { TV_SCREENS, deviceKey, tvRequest } from '@/lib/tvControl';
import {
  initialDisplayState,
  interruptedDisplayState,
  receivedDisplayState,
  validDeviceToken,
} from './tvScreenConnection';

export default function useTvScreen(screenId) {
  const [state, setState] = useState(initialDisplayState);
  const [revision, setRevision] = useState(0);
  const credential = useRef(null);
  const seenRevision = useRef('');
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  const connect = useCallback(
    (result) => {
      if (!validDeviceToken(result.deviceToken))
        throw new Error('The session could not be opened. Please try again.');
      credential.current = { screenId, token: result.deviceToken, preview: false };
      try {
        localStorage.setItem(deviceKey(screenId), result.deviceToken);
      } catch {
        // The current page can still watch when browser storage is unavailable.
      }
      setState((previous) => ({ ...previous, status: 'loading', error: '' }));
      refresh();
    },
    [screenId, refresh],
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let polling = false;
    let pollAgain = false;
    if (credential.current?.screenId !== screenId) {
      let token = '';
      try {
        token = localStorage.getItem(deviceKey(screenId)) || '';
        localStorage.removeItem(`jic-tv-setup-${screenId}`);
      } catch {
        // Normal display content does not require browser storage.
      }
      credential.current = {
        screenId,
        token: validDeviceToken(token) ? token : '',
        preview: false,
      };
      seenRevision.current = '';
    }
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (validDeviceToken(hash.get('preview'))) {
      credential.current = { screenId, token: hash.get('preview'), preview: true };
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    function forgetCredential() {
      const previous = credential.current;
      credential.current = { screenId, token: '', preview: false };
      if (!previous?.preview) {
        try {
          localStorage.removeItem(deviceKey(screenId));
        } catch {
          // An in-memory credential is enough for this visit.
        }
      }
    }

    async function poll() {
      if (controller.signal.aborted) return;
      clearTimeout(timer);
      if (polling) {
        pollAgain = true;
        return;
      }
      polling = true;
      const token = credential.current.token;
      try {
        const data = await tvRequest(
          'status',
          screenId,
          { deviceToken: token, seenRevision: seenRevision.current },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!data.paired && token) forgetCredential();
        seenRevision.current = data.revision || '';
        setState(receivedDisplayState(data, data.paired ? token : ''));
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 401) forgetCredential();
        setState((previous) =>
          interruptedDisplayState(
            { ...previous, deviceToken: credential.current.token },
            error.message,
          ),
        );
      } finally {
        polling = false;
        if (!controller.signal.aborted) {
          timer = setTimeout(poll, pollAgain ? 0 : 3000);
          pollAgain = false;
        }
      }
    }

    const resume = () => {
      if (document.visibilityState !== 'hidden') poll();
    };
    poll();
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [screenId, revision]);
  return {
    ...state,
    label: TV_SCREENS.find((item) => item.id === screenId)?.label,
    refresh,
    connect,
  };
}
