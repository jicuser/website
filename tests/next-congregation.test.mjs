import test from 'node:test';
import assert from 'node:assert/strict';
import { nextCongregation } from '../src/lib/nextCongregation.js';

const times = {
  fajr: '6:16 AM',
  jamaah_fajr: '6:45 AM',
  dhuhr: '12:58 PM',
  jamaah_dhuhr: '1:45 PM',
  asr: '4:20 PM',
  jamaah_asr: '5:15 PM',
  maghrib: '6:16 PM',
  jamaah_maghrib: '6:16 PM',
  isha: '7:27 PM',
  jamaah_isha: '8:15 PM',
};
const at = (iso, data = times, sessions = []) => nextCongregation(data, sessions, new Date(iso));

test('a congregation stays next between the start and jamaah times', () => {
  const next = at('2026-10-15T12:10:00Z'); // 13:10 BST
  assert.equal(next.name, 'Dhuhr');
  assert.equal(next.time, '1:45 PM');
  assert.equal(next.begins, '12:58 PM');
  assert.equal(at('2026-10-15T12:45:00Z').name, 'Dhuhr');
  assert.equal(at('2026-10-15T12:46:00Z').name, 'Asr');
});

test('Friday uses both published Jummah sessions, then Asr', () => {
  const sessions = [
    { prayer: '1:30 PM', khutbah: '1:15 PM' },
    { prayer: '2:30 PM', khutbah: '2:15 PM' },
  ];
  const first = at('2026-10-16T11:00:00Z', times, sessions);
  assert.equal(first.name, 'Jummah 1');
  assert.equal(first.beginsLabel, 'Khutbah');
  assert.equal(first.begins, '1:15 PM');
  assert.equal(at('2026-10-16T12:31:00Z', times, sessions).name, 'Jummah 2');
  assert.equal(at('2026-10-16T13:31:00Z', times, sessions).name, 'Asr');
  assert.equal(at('2026-10-15T12:31:00Z', times, sessions).name, 'Dhuhr');
  assert.equal(at('2026-10-16T11:00:00Z', times, [{ prayer: '—' }, sessions[1]]).name, 'Jummah 2');
});

test('London daylight saving changes are respected independently of the browser timezone', () => {
  assert.equal(at('2026-10-24T12:50:00Z').name, 'Asr');
  assert.equal(at('2026-10-25T12:50:00Z').name, 'Dhuhr');
});

test('no upcoming congregation is invented after Isha or without data', () => {
  assert.equal(at('2026-10-15T20:30:00Z'), null);
  assert.equal(at('2026-10-15T07:00:00Z', null), null);
  assert.equal(at('2026-10-15T07:00:00Z', {}), null);
  assert.equal(at('invalid'), null);
});

test('stale timetable dates and malformed times are not presented as upcoming', () => {
  assert.equal(at('2026-10-15T07:00:00Z', { ...times, d_date: '2026-10-14' }), null);
  assert.equal(at('2026-10-15T07:00:00Z', { ...times, d_date: '2026-10-15' }).name, 'Dhuhr');
  assert.equal(at('2026-10-15T07:00:00Z', { jamaah_dhuhr: '25:99', jamaah_asr: '13:15 PM' }), null);
  assert.equal(at('2026-10-15T07:00:00Z', { jamaah_dhuhr: '13:45:00' }).time, '13:45:00');
});

test('home shows tomorrow’s published Fajr after Isha and rejects stale rows over DST', async () => {
  const { nextHomeCongregation } = await import('../src/lib/nextCongregation.js');
  const date = new Date('2026-10-24T22:30:00Z');
  const tomorrow = { ...times, d_date: '2026-10-25' };
  assert.equal(nextHomeCongregation(times, tomorrow, [], date).tomorrow, true);
  assert.equal(nextHomeCongregation(times, { ...tomorrow, d_date: '2026-10-26' }, [], date), null);
  assert.equal(nextHomeCongregation(times, null, [], date), null);
});
