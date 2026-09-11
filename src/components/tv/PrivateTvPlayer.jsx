import React, { useEffect, useRef, useState } from 'react';
import { tvRequest, waitForIce } from '@/lib/tvControl';

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
    let answerSent = false;
    let peerId;
    const call = (action, values = {}) =>
      tvRequest(
        action,
        screenId,
        { deviceToken, sessionId, ...values },
        { signal: controller.signal },
      );
    const play = () => {
      setMessage('');
      element
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    };
    const unavailable = () => {
      if (!controller.signal.aborted) onUnavailable();
    };
    const connection = () => {
      if (peer.connectionState === 'connected') {
        clearTimeout(disconnectedTimer);
        setMessage('');
      }
      if (peer.connectionState === 'failed') unavailable();
      if (peer.connectionState === 'disconnected') {
        setMessage('Reconnecting…');
        clearTimeout(disconnectedTimer);
        disconnectedTimer = setTimeout(unavailable, 15000);
      }
    };
    function createPeer(iceServers) {
      peer = new RTCPeerConnection({ iceServers });
      peer.onconnectionstatechange = connection;
      const incoming = new MediaStream();
      peer.ontrack = (event) => {
        incoming.addTrack(event.track);
        element.srcObject = incoming;
        play();
      };
    }
    const startup = setTimeout(unavailable, 45000);
    element.addEventListener('playing', () => clearTimeout(startup), {
      once: true,
      signal: controller.signal,
    });
    element.addEventListener('error', unavailable, { signal: controller.signal });
    async function start() {
      try {
        setMessage('Connecting…');
        if (sessionId) {
          const joined = await call('join');
          if (controller.signal.aborted) return;
          peerId = joined.peerId;
          createPeer(joined.iceServers);
          const receive = async () => {
            try {
              const state = await call('receive', { peerId });
              if (controller.signal.aborted) return;
              if (
                state.offer &&
                peer.remoteDescription &&
                state.offer.sdp !== peer.remoteDescription.sdp
              ) {
                peer.close();
                createPeer(joined.iceServers);
                answerSent = false;
              }
              if (state.offer && !peer.remoteDescription) {
                await peer.setRemoteDescription(state.offer);
                await peer.setLocalDescription(await peer.createAnswer());
                await waitForIce(peer, controller.signal);
              }
              if (peer.localDescription && !answerSent) {
                await call('answer', { peerId, description: peer.localDescription.toJSON() });
                answerSent = true;
              }
            } catch (error) {
              if (controller.signal.aborted) return;
              if ([401, 404, 409].includes(error.status)) {
                unavailable();
                return;
              }
              setMessage('Reconnecting…');
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
      } catch {
        unavailable();
      }
    }
    start();
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(startup);
      clearTimeout(disconnectedTimer);
      peer?.close();
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
      {message && <p role="status">{message}</p>}
      {blocked && (
        <button
          type="button"
          onClick={() =>
            video.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setMessage('Enable playback on this TV.'))
          }
        >
          Start video and audio
        </button>
      )}
    </div>
  );
}
