import test from 'node:test';
import assert from 'node:assert/strict';
import { streamDestinations, encoderArgs } from '../services/media-relay/destinations.mjs';
const allowed = { youtube: ['a.rtmps.youtube.com'], tiktok: ['approved.example'] };
test('relay allows exact approved streaming hosts and rejects unsafe targets', () => {
  const valid = {
    platform: 'youtube',
    url: 'rtmps://a.rtmps.youtube.com/live2',
    key: 'stream-key',
  };
  const urls = streamDestinations([valid], allowed);
  assert.deepEqual(urls, ['rtmps://a.rtmps.youtube.com/live2/stream-key']);
  for (const url of [
    'http://127.0.0.1',
    'rtmp://192.168.1.1',
    'rtmps://a.rtmps.youtube.com.evil.example/live',
    'rtmps://u:p@a.rtmps.youtube.com/live',
    'rtmps://a.rtmps.youtube.com:22/live',
  ])
    assert.throws(() => streamDestinations([{ ...valid, url }], allowed));
  assert.throws(() => streamDestinations([{ ...valid, key: 'bad\nkey' }], allowed));
  assert.throws(() => streamDestinations([valid, valid, valid], allowed));
  const args = encoderArgs(urls);
  assert.equal(args.at(-1), urls[0]);
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('aac'));
  assert.ok(args.includes('pipe:0'));
});
