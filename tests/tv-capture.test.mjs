import test from 'node:test';
import assert from 'node:assert/strict';
import { captureProblem, requestCapture, captureError } from '../src/lib/tvCapture.js';

const environment = (mediaDevices = {}) => ({
  isSecureContext: true,
  navigator: { mediaDevices },
  document: {},
});
test('capture invokes the browser chooser synchronously and keeps camera and screen separate', async () => {
  const calls = [];
  const browser = environment({
    getDisplayMedia: (options) => {
      calls.push(['screen', options]);
      return Promise.resolve('screen stream');
    },
    getUserMedia: (options) => {
      calls.push(['camera', options]);
      return Promise.resolve('camera stream');
    },
  });
  const stream = requestCapture('screen', true, browser);
  assert.deepEqual(calls, [['screen', { video: true, audio: true }]]);
  assert.equal(await stream, 'screen stream');
  assert.equal(await requestCapture('camera', false, browser), 'camera stream');
  assert.deepEqual(calls[1], [
    'camera',
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
  ]);
});
test('capabilities and known policy blocks explain why capture cannot start', () => {
  const browser = environment({ getDisplayMedia() {}, getUserMedia() {} });
  assert.equal(captureProblem('screen', browser), '');
  assert.match(captureProblem('screen', environment({ getUserMedia() {} })), /unavailable/);
  assert.equal(captureProblem('camera', environment({ getUserMedia() {} })), '');
  assert.match(captureProblem('screen', { ...browser, isSecureContext: false }), /HTTPS/);
  browser.document.featurePolicy = {
    features: () => ['display-capture'],
    allowsFeature: () => false,
  };
  assert.match(captureProblem('screen', browser), /blocks capture/);
  browser.document.featurePolicy.features = () => ['geolocation'];
  assert.equal(captureProblem('screen', browser), '');
});
test('errors distinguish OS capture restrictions, focus, permission and occupied-source responses', () => {
  assert.match(captureError({ name: 'InvalidStateError' }, 'screen'), /front/);
  assert.match(captureError({ name: 'NotReadableError' }, 'screen'), /system|System/);
  assert.match(captureError({ name: 'NotAllowedError' }, 'camera'), /Camera or microphone/);
  assert.equal(
    captureError({ status: 409, message: 'This source is occupied.' }, 'screen'),
    'This source is occupied.',
  );
});
