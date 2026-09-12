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
