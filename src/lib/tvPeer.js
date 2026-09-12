// Wait for the complete candidate list: this transport sends SDP, not trickle ICE.
export function waitForIce(peer, signal, timeoutMs = 15000) {
  if (signal?.aborted) return Promise.reject(new DOMException('Sharing stopped', 'AbortError'));
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (error) => {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', changed);
      signal?.removeEventListener('abort', aborted);
      error ? reject(error) : resolve();
    };
    const changed = () => {
      if (peer.iceGatheringState === 'complete') finish();
    };
    const aborted = () => finish(new DOMException('Sharing stopped', 'AbortError'));
    peer.addEventListener('icegatheringstatechange', changed);
    signal?.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(
      () => finish(new DOMException('Network candidate gathering timed out', 'TimeoutError')),
      timeoutMs,
    );
    changed();
  });
}

export const descriptionJson = ({ type, sdp }) => ({ type, sdp });

// Keep the offered SDP separately: browsers may normalise remoteDescription.sdp.
// A failed HTTP answer can be retried without destroying an otherwise valid peer.
export function createReceiverNegotiator({ createPeer, sendAnswer, signal, onStage = () => {} }) {
  let peer;
  let offerSdp;
  let answerSent = false;
  return {
    async accept(offer) {
      if (!offer || signal?.aborted) return;
      if (offer.sdp !== offerSdp) {
        peer?.close();
        peer = createPeer();
        offerSdp = offer.sdp;
        answerSent = false;
      }
      if (answerSent) return;
      onStage('answering');
      if (!peer.remoteDescription) await peer.setRemoteDescription(offer);
      if (!peer.localDescription) await peer.setLocalDescription(await peer.createAnswer());
      await waitForIce(peer, signal);
      if (signal?.aborted) return;
      await sendAnswer(descriptionJson(peer.localDescription), offerSdp);
      answerSent = true;
      onStage('answered');
    },
    close() {
      peer?.close();
    },
  };
}

export function receiverErrorState(error) {
  return [
    'NotSupportedError',
    'OperationError',
    'InvalidStateError',
    'NetworkError',
    'TimeoutError',
  ].includes(error?.name)
    ? error.name
    : 'failed';
}

export function publisherMessage(peers, connected) {
  if (connected)
    return `Sharing to ${connected} display${connected > 1 ? 's' : ''}. Keep this page open.`;
  if (!peers.length)
    return 'Waiting for a TV. Open View TV to test, or connect the TV using its on-screen code.';
  if (
    peers.some((p) =>
      ['NotSupportedError', 'OperationError', 'InvalidStateError'].includes(p.receiver_state),
    )
  )
    return 'The receiving browser could not accept the video. Try an updated browser or a TV browser device.';
  if (peers.some((p) => ['failed', 'NetworkError', 'TimeoutError'].includes(p.receiver_state)))
    return 'The display could not connect. Reconnecting; check both devices are on the mosque Wi-Fi. Other networks may need a relay.';
  if (peers.every((p) => !p.answer)) return 'Display found. Waiting for it to accept the video…';
  return 'Video accepted. Connecting devices… Different networks may need a relay.';
}
