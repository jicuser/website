import { useCallback, useEffect, useRef, useState } from 'react';
import { tvRequest, waitForIce } from '@/lib/tvControl';
import { descriptionJson } from '@/lib/tvPeer';
import { publisherStatus } from '@/lib/publisherStatus';
import { requestCapture, captureError } from '@/lib/tvCapture';
import { releaseOwnCaptureLease, saveCaptureLease, clearCaptureLease } from '@/lib/captureLease';

export default function useTvPublisher(screenId, slot) {
  const active = useRef(null);
  const mounted = useRef(true);
  const [state, setState] = useState({
    busy: false,
    stream: null,
    sessionId: '',
    message: '',
    connected: 0,
  });
  const stop = useCallback(
    async (expected = active.current) => {
      const current = active.current;
      if (current !== expected) return;
      active.current = null;
      if (!current) return;
      current.controller.abort();
      clearTimeout(current.timer);
      current.peers.forEach((entry) => entry.pc.close());
      current.stream?.getTracks().forEach((track) => track.stop());
      if (mounted.current)
        setState({
          busy: false,
          stream: null,
          sessionId: '',
          message: 'Sharing stopped.',
          connected: 0,
        });
      if (current.sessionId) {
        try {
          await tvRequest('stop', screenId, { sessionId: current.sessionId }, { staff: true });
          clearCaptureLease(screenId, slot, current.sessionId);
        } catch {
          if (mounted.current && !active.current)
            setState((previous) => ({
              ...previous,
              message:
                'Capture stopped on this device. Its server connection will expire shortly; you can retry here.',
            }));
        }
      }
    },
    [screenId, slot],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);
  useEffect(() => {
    if (!state.stream) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.stream]);
  const start = useCallback(
    async (kind, audio = false, deviceName = '') => {
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
      setState({
        busy: true,
        stream: null,
        sessionId: '',
        message: 'Choose what to share…',
        connected: 0,
      });
      const call = (action, values = {}) =>
        tvRequest(
          action,
          screenId,
          { sessionId: current.sessionId, ...values },
          { staff: true, signal: current.controller.signal },
        );
      try {
        // Capture starts in the click handler to preserve the browser's user gesture.
        current.stream = await requestCapture(kind, audio);
        if (active.current !== current) {
          current.stream.getTracks().forEach((track) => track.stop());
          return;
        }
        current.stream
          .getVideoTracks()
          .forEach((track) => track.addEventListener('ended', () => stop(current), { once: true }));
        setState((previous) => ({
          ...previous,
          stream: current.stream,
          message: 'Capture is active on this device. Starting its viewing connection…',
        }));
        // A refresh ends local capture, but its server lease may still be alive.
        // Release only this tab's old lease; another contributor is never reset.
        await releaseOwnCaptureLease(screenId, slot, (sessionId) => call('stop', { sessionId }));
        if (active.current !== current) return;
        const started = await call('start', { kind, slot, deviceName });
        current.sessionId = started.sessionId;
        saveCaptureLease(screenId, slot, started.sessionId);
        if (active.current !== current) {
          await tvRequest('stop', screenId, { sessionId: started.sessionId }, { staff: true });
          clearCaptureLease(screenId, slot, started.sessionId);
          return;
        }
        setState({
          busy: false,
          stream: current.stream,
          sessionId: current.sessionId,
          message: 'Capture is active on this device. Waiting for a viewing screen…',
          connected: 0,
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
            // Finish every peer before the next poll; one failed viewer must
            // not leave offers running behind a replacement negotiation.
            const negotiations = await Promise.allSettled(
              peers.map(async (peer) => {
                let entry = current.peers.get(peer.id);
                try {
                  const state = entry?.pc.connectionState;
                  if (entry && ['failed', 'disconnected'].includes(state)) {
                    entry.disconnectedAt ||= Date.now();
                  } else if (entry) entry.disconnectedAt = 0;
                  if (
                    entry &&
                    (!peer.offer ||
                      (entry.disconnectedAt && Date.now() - entry.disconnectedAt > 15000))
                  ) {
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
                      description: descriptionJson(pc.localDescription),
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
            const failures = negotiations.filter((result) => result.status === 'rejected');
            if (failures.length)
              throw (
                failures.find((result) => [401, 403, 409].includes(result.reason.status)) ||
                failures[0]
              ).reason;
            const connected = [...current.peers.values()].filter(
              ({ pc }) => pc.connectionState === 'connected',
            ).length;
            if (active.current === current)
              setState((previous) => ({
                ...previous,
                connected,
                message: publisherStatus(peers, connected),
              }));
          } catch (error) {
            if (active.current !== current) return;
            if (error.status === 401 || error.status === 403 || error.status === 409) {
              await stop(current);
              if (mounted.current && !active.current)
                setState((previous) => ({ ...previous, message: error.message }));
              return;
            }
            setState((previous) => ({
              ...previous,
              message:
                error.name === 'TimeoutError'
                  ? 'The network connection timed out. Retrying automatically; check Wi-Fi. Connections across networks may need a relay.'
                  : `${error.message || 'Connection interrupted.'} Retrying automatically…`,
            }));
          }
          if (active.current === current) current.timer = setTimeout(poll, 2000);
        };
        poll();
      } catch (error) {
        await stop(current);
        if (mounted.current && !active.current)
          setState({
            busy: false,
            stream: null,
            sessionId: '',
            connected: 0,
            message: captureError(error, kind),
          });
      }
    },
    [screenId, slot, stop],
  );
  const retry = useCallback(() => {
    const current = active.current;
    if (!current) return;
    // Closing only this publisher's peers lets the existing poll rebuild them.
    current.peers.forEach(({ pc }) => pc.close());
    current.peers.clear();
    setState((previous) => ({
      ...previous,
      connected: 0,
      message: 'Retrying the viewing connections…',
    }));
  }, []);
  return { ...state, start, stop, retry };
}
