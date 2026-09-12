import { descriptionJson } from './tvPeer.js';
import { publisherStatus } from './publisherStatus.js';
import { captureError } from './tvCapture.js';
import { releaseOwnCaptureLease, saveCaptureLease, clearCaptureLease } from './captureLease.js';

export const initialPublisherState = {
  busy: false,
  stream: null,
  sessionId: '',
  phase: 'idle',
  message: '',
  connected: 0,
};

// A local capture outlives its editor dialog. Publishing is a separate connection
// so Start stream can reuse prepared tracks without reopening the browser chooser.
export function createPublisherController({
  screenId,
  slot,
  request,
  capture,
  waitForIce,
  notify,
  peerConnection = (options) => new RTCPeerConnection(options),
  storage,
}) {
  let active = null;
  let destination = { setupOnly: false, presentationId: '' };
  let state = { ...initialPublisherState };
  let destroyed = false;
  const update = (changes) => {
    state = { ...state, ...changes };
    if (!destroyed) notify(state);
  };
  const destinationKey = () => destination.presentationId || 'current';
  const ready = (message = 'Ready on this device. Press Start stream when your scene is ready.') =>
    update({ busy: false, sessionId: '', phase: 'ready', connected: 0, message });
  const closePeers = (connection) => {
    connection.peers.forEach(({ pc }) => pc.close());
    connection.peers.clear();
  };
  const release = async (connection) => {
    if (!connection) return;
    connection.controller.abort();
    clearTimeout(connection.timer);
    closePeers(connection);
    if (connection.sessionId) {
      await request('stop', { sessionId: connection.sessionId });
      clearCaptureLease(screenId, slot, connection.sessionId, storage);
    }
  };
  const stop = async (expected = active) => {
    const current = active;
    if (!current || current !== expected) return;
    active = null;
    current.stream?.getTracks().forEach((track) => track.stop());
    update({ ...initialPublisherState, message: 'Sharing stopped.' });
    try {
      await release(current.connection);
    } catch {
      if (!active)
        update({
          message: 'Capture stopped on this device. Its server connection will expire shortly.',
        });
    }
  };

  const publish = async (current) => {
    if (active !== current || !current.stream || destination.setupOnly) return;
    const key = destinationKey();
    if (current.connection?.key === key || current.attemptedKey === key) return;
    current.attemptedKey = key;
    const previous = current.connection;
    const connection = {
      key,
      controller: new AbortController(),
      peers: new Map(),
      sessionId: '',
      timer: null,
      heartbeat: 0,
    };
    current.connection = connection;
    const isCurrent = () => active === current && current.connection === connection;
    const call = (action, values = {}) =>
      request(action, { sessionId: connection.sessionId, ...values }, connection.controller.signal);
    update({ busy: true, phase: 'connecting', connected: 0, message: 'Connecting this source…' });
    try {
      await release(previous);
      if (!isCurrent()) return;
      // Refresh can leave this tab's old lease alive. Never release another
      // contributor's source merely because it occupies the same scene box.
      await releaseOwnCaptureLease(
        screenId,
        slot,
        (sessionId) => call('stop', { sessionId }),
        storage,
      );
      if (!isCurrent()) return;
      const started = await call('start', {
        kind: current.kind,
        slot,
        deviceName: current.deviceName,
      });
      connection.sessionId = started.sessionId;
      if (!isCurrent()) {
        await release(connection);
        return;
      }
      saveCaptureLease(screenId, slot, started.sessionId, storage);
      update({
        busy: false,
        sessionId: connection.sessionId,
        phase: 'publishing',
        message: 'Source connected. Waiting for a viewing display…',
      });
      const poll = async () => {
        try {
          if (Date.now() - connection.heartbeat > 20000) {
            await call('heartbeat');
            connection.heartbeat = Date.now();
          }
          const { peers } = await call('peers');
          if (!isCurrent()) return;
          for (const [id, entry] of connection.peers) {
            if (!peers.some((peer) => peer.id === id)) {
              entry.pc.close();
              connection.peers.delete(id);
            }
          }
          const negotiations = await Promise.allSettled(
            peers.map(async (peer) => {
              let entry = connection.peers.get(peer.id);
              try {
                const status = entry?.pc.connectionState;
                if (entry && ['failed', 'disconnected'].includes(status))
                  entry.disconnectedAt ||= Date.now();
                else if (entry) entry.disconnectedAt = 0;
                if (
                  entry &&
                  (!peer.offer ||
                    (entry.disconnectedAt && Date.now() - entry.disconnectedAt > 15000))
                ) {
                  entry.pc.close();
                  connection.peers.delete(peer.id);
                  entry = null;
                }
                if (!entry) {
                  const pc = peerConnection({ iceServers: started.iceServers });
                  entry = { pc };
                  connection.peers.set(peer.id, entry);
                  current.stream.getTracks().forEach((track) => pc.addTrack(track, current.stream));
                  await pc.setLocalDescription(await pc.createOffer());
                  await waitForIce(pc, connection.controller.signal);
                  if (!isCurrent()) return;
                  await call('offer', {
                    peerId: peer.id,
                    description: descriptionJson(pc.localDescription),
                  });
                } else if (peer.answer && !entry.pc.remoteDescription) {
                  await entry.pc.setRemoteDescription(peer.answer);
                }
              } catch (error) {
                entry?.pc.close();
                connection.peers.delete(peer.id);
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
          const connected = [...connection.peers.values()].filter(
            ({ pc }) => pc.connectionState === 'connected',
          ).length;
          if (isCurrent()) update({ connected, message: publisherStatus(peers, connected) });
        } catch (error) {
          if (!isCurrent()) return;
          if ([401, 403, 409].includes(error.status)) {
            current.connection = null;
            await release(connection).catch(() => {});
            if (active === current && !current.connection)
              ready(`${error.message} Local capture is kept. Retry the connection when ready.`);
            return;
          }
          update({
            message:
              error.name === 'TimeoutError'
                ? 'The connection timed out. Retrying automatically; check the network.'
                : `${error.message || 'Connection interrupted.'} Retrying automatically…`,
          });
        }
        if (isCurrent()) connection.timer = setTimeout(poll, 2000);
      };
      void poll();
    } catch (error) {
      if (!isCurrent()) return;
      current.connection = null;
      await release(connection).catch(() => {});
      if (active === current && !current.connection)
        ready(`${captureError(error, current.kind)} Local capture is kept. Retry the connection.`);
    }
  };

  const configure = (next) => {
    destination = { ...destination, ...next };
    const current = active;
    if (current && next.captureKind && current.kind !== next.captureKind) {
      void stop(current);
      return;
    }
    if (current && typeof next.deviceName === 'string') current.deviceName = next.deviceName;
    if (!current?.stream) return;
    if (destination.setupOnly) {
      if (current.connection) {
        const connection = current.connection;
        current.connection = null;
        current.attemptedKey = '';
        void release(connection).catch(() => {});
        ready();
      }
      return;
    }
    void publish(current);
  };
  const start = async (kind, audio = false, deviceName = '') => {
    if (active || destroyed) return;
    const current = { stream: null, kind, deviceName, connection: null, attemptedKey: '' };
    active = current;
    update({
      ...initialPublisherState,
      busy: true,
      phase: 'choosing',
      message: 'Choose what to share…',
    });
    try {
      // This call happens before any network await in the button handler.
      current.stream = await capture(kind, audio);
      if (active !== current) {
        current.stream.getTracks().forEach((track) => track.stop());
        return;
      }
      current.stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => void stop(current), { once: true });
      });
      update({ stream: current.stream });
      ready();
      if (!destination.setupOnly) await publish(current);
    } catch (error) {
      if (active !== current) return;
      await stop(current);
      if (!active) update({ message: captureError(error, kind) });
    }
  };
  const retry = () => {
    const current = active;
    if (!current?.stream || destination.setupOnly) return;
    if (current.connection) {
      closePeers(current.connection);
      update({ connected: 0, message: 'Retrying the viewing connections…' });
    } else {
      current.attemptedKey = '';
      void publish(current);
    }
  };
  return {
    start,
    stop,
    retry,
    configure,
    destroy: () => {
      destroyed = true;
      return stop();
    },
  };
}
