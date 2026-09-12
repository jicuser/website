import { useEffect, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';

// Geometry stays in the draft. Live inputs use the same session-bound receiver
// as the display, with a short-lived credential that never enters browser storage.
export default function useTvPreview(screenId, enabled) {
  const [state, setState] = useState({ paired: false, inputs: [], error: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let credential;
    let timer;
    const revoke = (value) =>
      value &&
      tvRequest('revoke', screenId, { deviceId: value.deviceId }, { staff: true }).catch(() => {});

    async function poll() {
      try {
        if (!credential) {
          credential = await tvRequest(
            'preview',
            screenId,
            {},
            { staff: true, signal: controller.signal },
          );
          if (controller.signal.aborted) {
            revoke(credential);
            return;
          }
        }
        const result = await tvRequest(
          'status',
          screenId,
          { deviceToken: credential.deviceToken },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!result.paired) {
          revoke(credential);
          credential = null;
          setState({
            paired: false,
            inputs: [],
            error: 'Waiting for an active presentation. Your draft is kept.',
          });
        } else {
          setState({ ...result, deviceToken: credential.deviceToken, error: '' });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ paired: false, inputs: [], error: error.message });
        if (error.status === 401 || error.status === 409) {
          revoke(credential);
          credential = null;
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
    }
    setState({ paired: false, inputs: [], error: '' });
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
      revoke(credential);
    };
  }, [screenId, enabled]);
  return enabled ? state : { paired: false, inputs: [], error: '' };
}
