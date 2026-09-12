import { useCallback, useEffect, useRef, useState } from 'react';
import { TV_SCREENS, deviceKey, tvRequest } from '@/lib/tvControl';
import { supabase } from '@/lib/supabaseClient';
import { subscribeDisplayRefresh } from '@/lib/displayRefresh';
import {
  readDisplayIdentity,
  initialDisplayState,
  interruptedDisplayState,
  readDisplayLink,
  receivedDisplayState,
  validDeviceToken,
} from './tvScreenConnection';

function rememberToken(screenId, token) {
  try {
    localStorage.setItem(deviceKey(screenId), token);
  } catch {
    // Storage restrictions only prevent remembering this display after the page closes.
  }
}

function viewerName() {
  try {
    return localStorage.getItem('jic-display-name')?.trim().slice(0, 60) || 'Shared-link viewer';
  } catch {
    return 'Shared-link viewer';
  }
}

export default function useTvScreen(screenId, { normalPreview = false } = {}) {
  const [state, setState] = useState(initialDisplayState);
  const [identity, setIdentity] = useState({ token: '', preview: false });
  const [linkError, setLinkError] = useState('');
  const [revision, setRevision] = useState(0);
  const credential = useRef(null);
  const openingLink = useRef(undefined);
  const seenRevision = useRef('');
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let polling = false;
    let pollAgain = false;
    if (credential.current?.screenId !== screenId) {
      let token = '';
      if (!normalPreview) {
        try {
          token = readDisplayIdentity(localStorage, deviceKey(screenId));
        } catch {
          // Some browsers restrict even access to the storage object.
          token = readDisplayIdentity(null, deviceKey(screenId));
        }
      }
      credential.current = { screenId, token, preview: normalPreview };
      seenRevision.current = '';
    }
    if (openingLink.current === undefined) {
      openingLink.current = normalPreview ? null : readDisplayLink(window.location.hash);
      if (openingLink.current)
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (openingLink.current?.previewToken)
      credential.current = { screenId, token: openingLink.current.previewToken, preview: true };
    setIdentity(credential.current);

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
          { signal: controller.signal, timeoutMs: 6000 },
        );
        if (controller.signal.aborted) return;
        seenRevision.current = data.revision || '';
        // Approval may end, but this browser still needs its identity and rolling code.
        setState(receivedDisplayState(data, token));
      } catch (error) {
        if (controller.signal.aborted) return;
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

    let joining = Boolean(openingLink.current?.code);
    async function open() {
      const link = openingLink.current;
      if (link?.error) setLinkError(link.error);
      if (link?.code) {
        setLinkError('');
        try {
          const result = await tvRequest(
            'join-session',
            screenId,
            { code: link.code, presentationId: link.presentationId, name: viewerName() },
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          if (!validDeviceToken(result.deviceToken))
            throw new Error('Unable to open this stream link. Please try again.');
          credential.current = { screenId, token: result.deviceToken, preview: false };
          rememberToken(screenId, result.deviceToken);
          setIdentity(credential.current);
          openingLink.current = null;
        } catch (error) {
          if (controller.signal.aborted) return;
          setLinkError(error.message || 'Unable to open this stream link. Please try again.');
        }
      }
      joining = false;
      poll();
    }
    const resume = () => {
      if (!joining && document.visibilityState !== 'hidden') poll();
    };
    open();
    const unsubscribe = subscribeDisplayRefresh(supabase, screenId, resume);
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      controller.abort();
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [screenId, revision, normalPreview]);
  return {
    ...state,
    identityToken: identity.token,
    preview: identity.preview,
    linkError,
    label: TV_SCREENS.find((item) => item.id === screenId)?.label,
    refresh,
  };
}
