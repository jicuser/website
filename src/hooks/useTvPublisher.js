import { useEffect, useRef, useState } from 'react';
import { tvRequest, waitForIce } from '@/lib/tvControl';
import { requestCapture } from '@/lib/tvCapture';
import { createPublisherController, initialPublisherState } from '@/lib/tvPublisherController';

export default function useTvPublisher(
  screenId,
  slot,
  { setupOnly = false, presentationId = '', captureKind, deviceName } = {},
) {
  const controller = useRef(null);
  const [state, setState] = useState(initialPublisherState);
  useEffect(() => {
    setState(initialPublisherState);
    const publisher = createPublisherController({
      screenId,
      slot,
      request: (action, values, signal) =>
        tvRequest(action, screenId, values, { staff: true, signal }),
      capture: requestCapture,
      waitForIce,
      notify: setState,
    });
    controller.current = publisher;
    return () => {
      controller.current = null;
      void publisher.destroy();
    };
  }, [screenId, slot]);
  useEffect(() => {
    controller.current?.configure({ setupOnly, presentationId, captureKind, deviceName });
  }, [screenId, slot, setupOnly, presentationId, captureKind, deviceName]);
  useEffect(() => {
    if (!state.stream) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.stream]);
  return {
    ...state,
    start: (kind, audio, deviceName) => controller.current?.start(kind, audio, deviceName),
    stop: () => controller.current?.stop(),
    retry: () => controller.current?.retry(),
  };
}
