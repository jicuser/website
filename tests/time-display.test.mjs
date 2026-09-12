import test from 'node:test';
import assert from 'node:assert/strict';
import { displayTime } from '../src/lib/timetable.js';
test('12-hour output accepts raw database and already-formatted prayer data', () => {
  for (const [input, expected] of [
    ['00:00', '12:00 AM'],
    ['12:00:00', '12:00 PM'],
    ['17:27', '5:27 PM'],
    ['5:17 AM', '5:17 AM'],
    ['1:09 PM', '1:09 PM'],
    ['09:15 pm', '9:15 PM'],
    ['6:00 AM', '6:00 AM'],
  ])
    assert.equal(displayTime(input), expected);
  for (const invalid of [null, '—', '25:00', '12:99', '00:30 PM', 'bad'])
    assert.equal(displayTime(invalid), '—');
});
