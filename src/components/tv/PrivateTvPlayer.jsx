import React, { useEffect, useRef, useState } from 'react';
import { tvRequest, waitForIce } from '@/lib/tvControl';
import { createReceiverNegotiator, receiverErrorState } from '@/lib/tvPeer';

export default function PrivateTvPlayer({
  screenId,
  deviceToken,
  sessionId,
  url,
  protocol,
  muted = true,
  onUnavailable,
}) {
  const video = useRef(null);
  const [message, setMessage] = useState('Connecting…');
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const element = video.current;
    let peer;
    let hls;
    let timer;
    let resourceUrl;
    let disconnectedTimer;
    let negotiator;
    let peerId;
    let lastReportedState;
    const call = (action, values = {}) =>
      tvRequest(
        action,
        screenId,
        { deviceToken, sessionId, ...values },
        { signal: controller.signal },
      );
    const report = (state) => {
      if (!peerId || controller.signal.aborted || state === lastReportedState) return;
      lastReportedState = state;
      call('receiver-state', { peerId, state }).catch(() => {});
    };
    const leave = () =>
      peerId &&
      tvRequest('leave', screenId, {
        deviceToken,
        sessionId,
        peerId,
      }).catch(() => {});
    const play = () => {
      element
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    };
    const unavailable = (reason = 'Video connection interrupted. Retrying…', state = 'failed') => {
      if (!controller.signal.aborted) {
        report(state);
        onUnavailable(typeof reason === 'string' ? reason : 'Video could not play. Retrying…');
      }
    };
    const connection = () => {
      if (peer.connectionState === 'connected') {
        clearTimeout(disconnectedTimer);
        report('connected');
      }
      if (peer.connectionState === 'failed') unavailable('Devices could not connect. Retrying…');
      if (peer.connectionState === 'disconnected') {
        setMessage('Reconnecting…');
        clearTimeout(disconnectedTimer);
        disconnectedTimer = setTimeout(unavailable, 15000);
      }
    };
    function createPeer(iceServers) {
      if (typeof RTCPeerConnection === 'undefined')
        throw new DOMException('WebRTC is unavailable', 'NotSupportedError');
      peer = new RTCPeerConnection({ iceServers });
      peer.onconnectionstatechange = connection;
      const incoming = new MediaStream();
      peer.ontrack = (event) => {
        incoming.addTrack(event.track);
        element.srcObject = incoming;
        play();
      };
      return peer;
    }
    const startup = setTimeout(() => unavailable('Still waiting for video. Retrying…'), 60000);
    element.addEventListener(
      'playing',
      () => {
        clearTimeout(startup);
        setMessage('');
        setBlocked(false);
      },
      {
        signal: controller.signal,
      },
    );
    element.addEventListener('error', unavailable, { signal: controller.signal });
    async function start() {
      try {
        setMessage('Connecting…');
        if (sessionId) {
          const joined = await call('join');
          peerId = joined.peerId;
          if (controller.signal.aborted) {
            leave();
            return;
          }
          negotiator = createReceiverNegotiator({
            createPeer: () => createPeer(joined.iceServers),
            sendAnswer: (description, offerSdp) =>
              call('answer', { peerId, description, offerSdp }),
            signal: controller.signal,
            onStage: report,
          });
          const receive = async () => {
            try {
              const state = await call('receive', { peerId });
              if (controller.signal.aborted) return;
              await negotiator.accept(state.offer);
            } catch (error) {
              if (controller.signal.aborted) return;
              if ([401, 404].includes(error.status)) {
                unavailable();
                return;
              }
              report(receiverErrorState(error));
              setMessage(
                error.name === 'NotSupportedError'
                  ? 'This browser cannot play the shared video.'
                  : 'Video connection interrupted. Retrying…',
              );
            }
            if (!controller.signal.aborted) timer = setTimeout(receive, 2000);
          };
          receive();
        } else if (protocol === 'whep') {
          createPeer([]);
          peer.addTransceiver('video', { direction: 'recvonly' });
          peer.addTransceiver('audio', { direction: 'recvonly' });
          await peer.setLocalDescription(await peer.createOffer());
          await waitForIce(peer, controller.signal);
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: peer.localDescription.sdp,
            signal: controller.signal,
            credentials: 'omit',
          });
          if (!response.ok) throw new Error('Camera connection failed.');
          const location = response.headers.get('Location');
          resourceUrl = location ? new URL(location, url).href : null;
          await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
        } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = url;
          play();
        } else {
          const { default: Hls } = await import('hls.js');
          if (controller.signal.aborted) return;
          if (!Hls.isSupported()) throw new Error('HLS is unavailable in this browser.');
          hls = new Hls({ lowLatencyMode: true });
          hls.on(Hls.Events.MANIFEST_PARSED, play);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) unavailable();
          });
          hls.loadSource(url);
          hls.attachMedia(element);
        }
      } catch (error) {
        unavailable(
          error.name === 'NotSupportedError'
            ? 'This browser cannot play the shared video.'
            : 'Video could not connect. Retrying…',
          receiverErrorState(error),
        );
      }
    }
    start();
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(startup);
      clearTimeout(disconnectedTimer);
      negotiator?.close();
      peer?.close();
      leave();
      hls?.destroy();
      element.pause();
      element.srcObject = null;
      element.removeAttribute('src');
      element.load();
      if (resourceUrl?.startsWith('https:'))
        fetch(resourceUrl, { method: 'DELETE', keepalive: true, credentials: 'omit' }).catch(
          () => {},
        );
    };
  }, [screenId, deviceToken, sessionId, url, protocol, onUnavailable]);
  return (
    <div className="jic-tv-private-player">
      <video
        ref={video}
        autoPlay
        playsInline
        muted={muted}
        aria-label={sessionId ? 'Shared screen or camera' : 'Hall camera'}
      />
      {message && !blocked && <p role="status">{message}</p>}
      {blocked && (
        <button
          type="button"
          onClick={() =>
            video.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setMessage('Enable playback on this display.'))
          }
        >
          Start video and audio
        </button>
      )}
    </div>
  );
}
