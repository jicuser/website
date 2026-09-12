import { useEffect, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';

// An operator previews the same receiver streams as a TV, without storing a TV
// credential on the admin device. Geometry stays in the local scene draft.
export default function useTvPreview(screenId, enabled) {
  const [state, setState] = useState({ paired: false, inputs: [], error: '' });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let credential;
    let timer;
    const revoke = () =>
      credential &&
      tvRequest('revoke', screenId, { deviceId: credential.deviceId }, { staff: true }).catch(
        () => {},
      );
    async function poll() {
      try {
        const result = await tvRequest('status', screenId, { deviceToken: credential.deviceToken });
        if (active) setState({ ...result, deviceToken: credential.deviceToken, error: '' });
      } catch (error) {
        if (!active) return;
        setState({
          paired: false,
          inputs: [],
          error:
            error.status === 401
              ? 'Preview expired. Turn the picture off and on to reconnect.'
              : error.message,
        });
        if (error.status === 401) return;
      }
      if (active) timer = setTimeout(poll, 8000);
    }
    async function open() {
      setState({ paired: false, inputs: [], error: '' });
      try {
        credential = await tvRequest('preview', screenId, {}, { staff: true });
        if (!active) {
          revoke();
          return;
        }
        poll();
      } catch (error) {
        if (active) setState({ paired: false, inputs: [], error: error.message });
      }
    }
    open();
    return () => {
      active = false;
      clearTimeout(timer);
      revoke();
    };
  }, [screenId, enabled]);
  return enabled ? state : { paired: false, inputs: [], error: '' };
}
