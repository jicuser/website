import test from 'node:test';
import assert from 'node:assert/strict';
import { currentPrayer } from '../src/lib/currentPrayer.js';
import { nextPrayer } from '../src/lib/nextPrayer.js';

const times = {
  fajr: '05:00',
  sunrise: '06:30',
  dhuhr: '13:00',
  asr: '16:30',
  maghrib: '19:30',
  isha: '21:00',
  jamaah_dhuhr: '13:45',
};
const london = (clock) => new Date(`2026-09-12T${clock}:00+01:00`);

test('the current highlight changes at start times, independently of the next countdown', () => {
  for (const [clock, expected] of [
    ['05:00', 'fajr'],
    ['06:29', 'fajr'],
    ['13:00', 'dhuhr'],
    ['13:45', 'dhuhr'],
    ['16:29', 'dhuhr'],
    ['16:30', 'asr'],
    ['19:30', 'maghrib'],
    ['21:00', 'isha'],
  ]) {
    assert.equal(currentPrayer(times, london(clock))?.key, expected);
  }
  assert.equal(currentPrayer(times, london('14:00')).name, 'Dhuhr');
  assert.equal(nextPrayer(times, london('14:00')).name, 'Asr');
});

test('overnight remains Isha and sunrise does not highlight the next prayer early', () => {
  for (const clock of ['23:59', '00:00', '04:59'])
    assert.equal(currentPrayer(times, london(clock)).key, 'isha');
  for (const clock of ['06:30', '10:00', '12:59'])
    assert.equal(currentPrayer(times, london(clock)), null);
});

test('time parsing handles AM/PM and uses London time in summer and winter', () => {
  const formatted = { ...times, dhuhr: '1:00 PM', asr: '4:30 PM', isha: '9:00 PM' };
  assert.equal(currentPrayer(formatted, new Date('2026-09-12T12:00:00Z')).key, 'dhuhr');
  assert.equal(currentPrayer(formatted, new Date('2026-01-12T12:00:00Z')), null);
  assert.equal(currentPrayer(formatted, new Date('2026-01-12T13:00:00Z')).key, 'dhuhr');
  assert.equal(currentPrayer(null, london('14:00')), null);
  assert.equal(currentPrayer({ fajr: '25:99', isha: 'N/A' }, london('14:00')), null);
  assert.equal(currentPrayer(times, new Date('invalid')), null);
});
