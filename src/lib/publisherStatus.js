export function publisherStatus(peers, connected) {
  if (connected)
    return `${connected} viewing connection${connected === 1 ? '' : 's'} established. Check the viewing screen for the picture.`;
  if (!peers.length)
    return 'Capture is active on this device. Waiting for a viewing screen; open the presentation or its preview.';
  if (
    peers.some((peer) =>
      ['NotSupportedError', 'OperationError', 'InvalidStateError'].includes(peer.receiver_state),
    )
  )
    return 'The viewing browser could not accept this video. Update that browser, then retry the connection.';
  if (
    peers.some((peer) => ['failed', 'NetworkError', 'TimeoutError'].includes(peer.receiver_state))
  )
    return 'The viewing screen could not connect. Retrying; check both devices are on the same Wi-Fi. Other networks may need a relay.';
  if (peers.every((peer) => !peer.answer))
    return 'Viewing screen found. Waiting for it to accept the connection…';
  return 'Viewing screen accepted the connection request. Connecting devices…';
}
