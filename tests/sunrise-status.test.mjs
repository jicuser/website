import test from 'node:test';
import assert from 'node:assert/strict';
import { sunriseStatus } from '../src/lib/sunriseStatus.js';

const state = (clock) => sunriseStatus('2026-11-04', '07:09', new Date(clock));
test('Shuroq moves from upcoming to prohibited exactly at the published sunrise', () => {
  assert.equal(state('2026-11-04T07:08:59Z').phase, 'upcoming');
  assert.equal(state('2026-11-04T07:09:00Z').phase, 'active');
  assert.equal(state('2026-11-04T07:28:59Z').phase, 'active');
});
test('the approximate sunrise buffer passes at 20 minutes and highlights Ishraq for one minute', () => {
  const start = state('2026-11-04T07:29:00Z');
  assert.equal(start.phase, 'passed');
  assert.equal(start.startingIshraq, true);
  assert.equal(start.ishraqAt - start.sunriseAt, 20 * 60000);
  assert.equal(state('2026-11-04T07:30:00Z').startingIshraq, false);
});
test('summer sunrise uses London daylight saving time, independently of the device zone', () => {
  const result = sunriseStatus('2026-06-15', '04:43', new Date('2026-06-15T03:45:00Z'));
  assert.equal(result.phase, 'active');
  assert.equal(new Date(result.ishraqAt).toISOString(), '2026-06-15T04:03:00.000Z');
});
test('other timetable days never make a live prohibition or passed claim', () => {
  for (const day of ['2026-11-03', '2026-11-05']) {
    const result = sunriseStatus(day, '07:09', new Date('2026-11-04T07:15:00Z'));
    assert.equal(result.phase, 'timetable');
    assert.equal(result.startingIshraq, false);
  }
});
test('missing, malformed and ambiguous times do not invent a sunrise period', () => {
  for (const sunrise of [null, '', '25:30', 'Not published']) {
    assert.equal(sunriseStatus('2026-11-04', sunrise).phase, 'unavailable');
  }
  assert.equal(
    sunriseStatus('2026-10-25', '01:30', new Date('2026-10-25T02:00:00Z')).phase,
    'unavailable',
  );
  assert.equal(sunriseStatus('2026-11-04', '07:09', new Date('invalid')).phase, 'unavailable');
});
