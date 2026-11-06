import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClock, clockInputParts, clockInputValue } from '../src/lib/clockTime.js';
import {
  displayLondonClock,
  displayTime,
  parseTimetable,
  prayerFields,
} from '../src/lib/timetable.js';

test('AM/PM entry preserves noon, midnight and afternoon through storage and display', () => {
  for (const [input, stored, shown] of [
    ['12:00 AM', '00:00', '12:00 AM'],
    ['12:00 PM', '12:00', '12:00 PM'],
    ['1:30 pm', '13:30', '1:30 PM'],
    ['06:15:00', '06:15', '6:15 AM'],
  ]) {
    assert.equal(normalizeClock(input), stored);
    assert.equal(displayTime(stored), shown);
    const { clock, period } = clockInputParts(stored);
    assert.equal(clockInputValue(clock, period), stored);
  }
  assert.equal(clockInputValue('1:30', 'AM'), '01:30');
  assert.equal(clockInputValue('1:30', 'PM'), '13:30');
});
test('incomplete or invalid edits are retained and cannot become a plausible saved clock', () => {
  for (const clock of ['1:', '13:00', '0:30', '7:90']) {
    const input = clockInputValue(clock, 'PM');
    assert.equal(normalizeClock(input), null);
    assert.equal(clockInputParts(input).clock, clock);
  }
  assert.equal(clockInputValue('', 'PM'), '');
});
test('visible London clocks show AM/PM across daylight saving changes', () => {
  assert.equal(displayLondonClock(new Date('2026-11-06T19:53:00Z')), '7:53 PM');
  assert.equal(displayLondonClock(new Date('2026-07-06T12:30:00Z')), '1:30 PM');
});
test('CSV imports accept explicit AM/PM and keep canonical database values', () => {
  const headers = ['d_date', ...prayerFields.map(([key]) => key)];
  const line = ['2026-11-06', ...prayerFields.map(() => '1:30 PM')];
  const parsed = parseTimetable(`${headers.join(',')}\n${line.join(',')}`);
  assert.equal(parsed[0].zuhr_jamah, '13:30');
  assert.throws(
    () => parseTimetable(`${headers.join(',')}\n${line.join(',').replace('1:30 PM', '13:30 PM')}`),
    /valid time/,
  );
});
