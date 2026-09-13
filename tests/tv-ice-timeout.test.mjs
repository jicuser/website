import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { waitForIce } from '../src/lib/tvPeer.js';

function peerWithCandidate(type) {
  const peer = new EventTarget();
  peer.iceGatheringState = 'gathering';
  peer.connectionState = 'new';
  peer.localDescription = {
    type: 'offer',
    sdp: `v=0\r\n${type ? `a=candidate:1 1 UDP 2122260223 192.0.2.10 51000 typ ${type}\r\n` : ''}`,
  };
  return peer;
}

for (const type of ['host', 'srflx', 'relay']) {
  test(`a slow ICE server does not discard an already gathered ${type} candidate`, async () => {
    const peer = peerWithCandidate(type);
    const controller = new AbortController();
    await assert.doesNotReject(waitForIce(peer, controller.signal, 5));
    assert.equal(getEventListeners(peer, 'icegatheringstatechange').length, 0);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
}

test('a timeout with no usable candidates remains a failure', async () => {
  const peer = peerWithCandidate();
  await assert.rejects(waitForIce(peer, undefined, 5), { name: 'TimeoutError' });
  assert.equal(getEventListeners(peer, 'icegatheringstatechange').length, 0);
});

test('completed gathering resolves before the timeout', async () => {
  const peer = peerWithCandidate('host');
  const pending = waitForIce(peer, undefined, 1000);
  peer.iceGatheringState = 'complete';
  peer.dispatchEvent(new Event('icegatheringstatechange'));
  await pending;
  assert.equal(getEventListeners(peer, 'icegatheringstatechange').length, 0);
});

test('stopping capture cancels gathering even with a usable candidate', async () => {
  const peer = peerWithCandidate('host');
  const controller = new AbortController();
  const pending = waitForIce(peer, controller.signal, 1000);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(getEventListeners(peer, 'icegatheringstatechange').length, 0);
});

test('a previously cancelled capture never resumes negotiation', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(waitForIce(peerWithCandidate('host'), controller.signal, 5), {
    name: 'AbortError',
  });
});

test('a closed peer cannot continue using stale candidates', async () => {
  const peer = peerWithCandidate('host');
  peer.connectionState = 'closed';
  await assert.rejects(waitForIce(peer, undefined, 5));
});
