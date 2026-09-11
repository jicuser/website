import { useCallback, useEffect, useRef, useState } from 'react';
import { tvRequest, waitForIce } from '@/lib/tvControl';

export default function useTvPublisher(screenId) {
  const active = useRef(null);
  const mounted = useRef(true);
  const [state, setState] = useState({ busy: false, stream: null, sessionId: '', message: '' });
  const stop = useCallback(async () => {
    const current = active.current;
    active.current = null;
    if (!current) return;
    current.controller.abort();
    clearTimeout(current.timer);
    current.peers.forEach((entry) => entry.pc.close());
    current.stream?.getTracks().forEach((track) => track.stop());
    if (mounted.current)
      setState({ busy: false, stream: null, sessionId: '', message: 'Sharing stopped.' });
    if (current.sessionId) {
      try {
        await tvRequest('stop', screenId, { sessionId: current.sessionId }, { staff: true });
      } catch {
        if (mounted.current)
          setState((previous) => ({
            ...previous,
            message: 'Capture stopped. The TV will return to posters when the connection expires.',
          }));
      }
    }
  }, [screenId]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);
  const start = useCallback(
    async (kind) => {
      if (active.current) return;
      const current = {
        controller: new AbortController(),
        peers: new Map(),
        stream: null,
        sessionId: '',
        timer: null,
        heartbeat: 0,
      };
      active.current = current;
      setState({ busy: true, stream: null, sessionId: '', message: 'Choose what to share…' });
      const call = (action, values = {}) =>
        tvRequest(
          action,
          screenId,
          { sessionId: current.sessionId, ...values },
          { staff: true, signal: current.controller.signal },
        );
      try {
        // Capture starts in the click handler to preserve the browser's user gesture.
        current.stream =
          kind === 'screen'
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            : await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
              });
        if (active.current !== current) {
          current.stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const started = await call('start', { kind });
        current.sessionId = started.sessionId;
        if (active.current !== current) {
          await tvRequest('stop', screenId, { sessionId: started.sessionId }, { staff: true });
          return;
        }
        current.stream
          .getVideoTracks()
          .forEach((track) => track.addEventListener('ended', stop, { once: true }));
        setState({
          busy: false,
          stream: current.stream,
          sessionId: current.sessionId,
          message: 'Waiting for a paired TV…',
        });
        const poll = async () => {
          try {
            if (Date.now() - current.heartbeat > 20000) {
              await call('heartbeat');
              current.heartbeat = Date.now();
            }
            const { peers } = await call('peers');
            if (active.current !== current) return;
            for (const [id, entry] of current.peers) {
              if (!peers.some((peer) => peer.id === id)) {
                entry.pc.close();
                current.peers.delete(id);
              }
            }
            await Promise.all(
              peers.map(async (peer) => {
                let entry = current.peers.get(peer.id);
                try {
                  if (entry && !peer.offer) {
                    entry.pc.close();
                    current.peers.delete(peer.id);
                    entry = null;
                  }
                  if (!entry) {
                    const pc = new RTCPeerConnection({ iceServers: started.iceServers });
                    entry = { pc };
                    current.peers.set(peer.id, entry);
                    current.stream
                      .getTracks()
                      .forEach((track) => pc.addTrack(track, current.stream));
                    await pc.setLocalDescription(await pc.createOffer());
                    await waitForIce(pc, current.controller.signal);
                    await call('offer', {
                      peerId: peer.id,
                      description: pc.localDescription.toJSON(),
                    });
                  } else if (peer.answer && !entry.pc.remoteDescription) {
                    await entry.pc.setRemoteDescription(peer.answer);
                  }
                } catch (error) {
                  entry?.pc.close();
                  current.peers.delete(peer.id);
                  throw error;
                }
              }),
            );
            const connected = [...current.peers.values()].filter(
              ({ pc }) => pc.connectionState === 'connected',
            ).length;
            if (active.current === current)
              setState((previous) => ({
                ...previous,
                message: connected
                  ? `Sharing to ${connected} TV${connected > 1 ? 's' : ''}. Keep this page open.`
                  : 'Connecting… open the paired TV on the same network.',
              }));
          } catch (error) {
            if (active.current !== current) return;
            if (error.status === 401 || error.status === 403 || error.status === 409) {
              await stop();
              return;
            }
            setState((previous) => ({
              ...previous,
              message: 'Connection interrupted. Reconnecting…',
            }));
          }
          if (active.current === current) current.timer = setTimeout(poll, 2000);
        };
        poll();
      } catch (error) {
        await stop();
        if (mounted.current)
          setState({
            busy: false,
            stream: null,
            sessionId: '',
            message:
              error.name === 'NotAllowedError'
                ? 'Sharing was cancelled or permission was denied.'
                : error.message,
          });
      }
    },
    [screenId, stop],
  );
  return { ...state, start, stop };
}
