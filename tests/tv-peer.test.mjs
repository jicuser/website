import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiverNegotiator, waitForIce, publisherMessage } from '../src/lib/tvPeer.js';

class Peer extends EventTarget {
  iceGatheringState = 'complete';
  remoteDescription = null;
  localDescription = null;
  closed = false;
  async setRemoteDescription(offer) {
    // A native browser can canonicalise SDP: it is not an offer revision identifier.
    this.remoteDescription = { ...offer, sdp: offer.sdp + 'normalised\r\n' };
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'v=0\r\nanswer\r\n' };
  }
  async setLocalDescription(answer) {
    this.localDescription = answer;
  }
  close() {
    this.closed = true;
  }
}
const offer = { type: 'offer', sdp: 'v=0\r\nfirst\r\n' };

test('one offer produces one answer even when the browser normalises remote SDP', async () => {
  let creations = 0;
  const sent = [];
  const receiver = createReceiverNegotiator({
    createPeer: () => {
      creations++;
      return new Peer();
    },
    sendAnswer: async (answer, source) => sent.push({ answer, source }),
  });
  await receiver.accept(offer);
  await receiver.accept({ ...offer });
  assert.equal(creations, 1);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    answer: { type: 'answer', sdp: 'v=0\r\nanswer\r\n' },
    source: offer.sdp,
  });
  receiver.close();
});

test('a failed answer upload retries the same answer without resetting the connection', async () => {
  let attempts = 0;
  const peer = new Peer();
  const receiver = createReceiverNegotiator({
    createPeer: () => peer,
    sendAnswer: async () => {
      if (++attempts === 1) throw new Error('Network unavailable');
    },
  });
  await assert.rejects(receiver.accept(offer));
  await receiver.accept(offer);
  assert.equal(attempts, 2);
  assert.equal(peer.closed, false);
  receiver.close();
});

test('an interrupted answer creation can resume after setting the remote offer', async () => {
  const peer = new Peer();
  let attempts = 0;
  peer.createAnswer = async () => {
    if (++attempts === 1) throw new Error('Temporary browser failure');
    return { type: 'answer', sdp: 'v=0\r\n' };
  };
  let sent = false;
  const receiver = createReceiverNegotiator({
    createPeer: () => peer,
    sendAnswer: async () => {
      sent = true;
    },
  });
  await assert.rejects(receiver.accept(offer));
  await receiver.accept(offer);
  assert.equal(sent, true);
  receiver.close();
});

test('a replacement offer closes the old peer and answers the new generation', async () => {
  const peers = [],
    sources = [];
  const receiver = createReceiverNegotiator({
    createPeer: () => {
      const peer = new Peer();
      peers.push(peer);
      return peer;
    },
    sendAnswer: async (_, source) => sources.push(source),
  });
  await receiver.accept(offer);
  await receiver.accept({ ...offer, sdp: 'v=0\r\nreplacement\r\n' });
  assert.equal(peers.length, 2);
  assert.equal(peers[0].closed, true);
  assert.notEqual(sources[0], sources[1]);
  receiver.close();
});

test('separate screen and camera receivers negotiate independently', async () => {
  const received = [];
  const create = (id) =>
    createReceiverNegotiator({
      createPeer: () => new Peer(),
      sendAnswer: async () => received.push(id),
    });
  const screen = create('screen'),
    camera = create('camera');
  await Promise.all([screen.accept(offer), camera.accept(offer)]);
  assert.deepEqual(received.sort(), ['camera', 'screen']);
  screen.close();
  camera.close();
});

test('ICE waits for candidates and rejects an incomplete timeout instead of sending partial SDP', async () => {
  const peer = new Peer();
  peer.iceGatheringState = 'gathering';
  await assert.rejects(waitForIce(peer, undefined, 5), { name: 'TimeoutError' });
  const waiting = waitForIce(peer, undefined, 100);
  peer.iceGatheringState = 'complete';
  peer.dispatchEvent(new Event('icegatheringstatechange'));
  await waiting;
});

test('stopping during ICE gathering cannot publish an answer', async () => {
  const peer = new Peer();
  peer.iceGatheringState = 'gathering';
  const controller = new AbortController();
  let sent = false;
  const receiver = createReceiverNegotiator({
    createPeer: () => peer,
    signal: controller.signal,
    sendAnswer: async () => {
      sent = true;
    },
  });
  const pending = receiver.accept(offer);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(sent, false);
  receiver.close();
});

test('status distinguishes missing receiver, unanswered offer and connected media', () => {
  assert.match(publisherMessage([], 0), /Waiting for a TV/);
  assert.match(publisherMessage([{ answer: null }], 0), /Waiting for it to accept/);
  assert.match(publisherMessage([{ answer: {} }], 0), /Video accepted/);
  assert.match(publisherMessage([{ receiver_state: 'OperationError' }], 0), /could not accept/);
  assert.match(publisherMessage([{}], 1), /Sharing to 1 display/);
});
