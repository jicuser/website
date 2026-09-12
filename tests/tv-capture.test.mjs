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
  assert.equal(calls[0][0], 'screen');
  assert.equal(calls[0][1].audio, true);
  assert.equal(calls[0][1].video.frameRate.max, 30);
  assert.equal(calls[0][1].video.width.max, 1920);
  assert.equal(calls[0][1].video.height.max, 1080);
  assert.equal(await stream, 'screen stream');
  assert.equal(await requestCapture('camera', false, browser), 'camera stream');
  assert.equal(calls[1][0], 'camera');
  const camera = calls[1][1];
  assert.equal(camera.audio, false);
  assert.equal(camera.video.facingMode.ideal, 'environment');
  assert.equal(camera.video.width.ideal, 1280);
  assert.equal(camera.video.height.ideal, 720);
  assert.equal(camera.video.frameRate.max, 30);
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
