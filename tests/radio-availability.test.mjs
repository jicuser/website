import test from 'node:test';
import assert from 'node:assert/strict';
import { broadcastAvailability } from '../src/lib/radioAvailability.js';

const active = (mount, title = 'JIC broadcast') => ({
  listenurl: `https://radio.example.test/${mount}`,
  server_type: 'audio/mpeg',
  audio_info: 'channels=2;samplerate=44100;bitrate=128',
  listeners: 0,
  title,
});

test('the station’s playable NOT LIVE holding track and empty mounts are off air', () => {
  assert.equal(
    broadcastAvailability({
      icestats: {
        source: [
          active('autodj', 'NOT LIVE - NOT LIVE [13vv]'),
          { listenurl: 'http://radio.example.test/live', listeners: 0 },
          { listenurl: 'http://radio.example.test/stream', listeners: 0 },
        ],
      },
    }),
    'offline',
  );
});

test('a live encoder source is live even before its first listener connects', () => {
  assert.equal(broadcastAvailability({ icestats: { source: active('live') } }), 'online');
  assert.equal(
    broadcastAvailability({ icestats: { source: [active('autodj'), active('stream')] } }),
    'online',
  );
});

test('fallback recordings and explicit off-air titles never announce a live broadcast', () => {
  for (const row of [
    active('autodj', 'Recorded recitation'),
    active('fallback'),
    active('stream', 'Not Live'),
    active('live', 'OFF-AIR'),
  ])
    assert.equal(broadcastAvailability({ icestats: { source: row } }), 'offline');
});

test('missing or malformed station data does not produce a live notice', () => {
  for (const value of [null, {}, { error: 'temporarily unavailable' }])
    assert.equal(broadcastAvailability(value), 'unknown');
  for (const source of [
    undefined,
    [],
    {},
    { title: 'LIVE', listeners: 12 },
    active('live', 'offline'),
  ])
    assert.equal(broadcastAvailability({ icestats: { source } }), 'offline');
});
