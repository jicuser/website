import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerDisplayState, londonWallInstant, countdownText } from '../src/lib/prayerDisplayState.js';

const row = (day = '2026-11-03') => ({ d_date: day, fajr: '05:23', sunrise: '07:00', dhuhr: '11:52', asr: '14:45', maghrib: '16:36', isha: '18:00', jamaah_fajr: '06:15', jamaah_dhuhr: '13:00', jamaah_asr: '15:00', jamaah_maghrib: '16:36', jamaah_isha: '19:30' });
const at = (clock, extra = {}) => prayerDisplayState({ todaysTimes: row(), ...extra }, new Date(`2026-11-03T${clock}Z`));

test('photo before Asr: Dhuhr remains current and Asr begins in 6m57s', () => {
  const value = at('14:38:03');
  assert.equal(value.current.key, 'dhuhr');
  assert.equal(value.target.kind, 'start');
  assert.equal(value.target.name, 'Asr');
  assert.equal(value.target.seconds, 417);
  assert.equal(value.target.congregationTime, '15:00');
});
test('photo after Asr: highlight Asr and count 11m19s to its Jamaat', () => {
  const value = at('14:48:41');
  assert.equal(value.current.key, 'asr');
  assert.equal(value.target.kind, 'jamaat');
  assert.equal(value.target.seconds, 679);
  assert.equal(countdownText(value.target.seconds), '00:11:19');
});
test('the last second before Asr stays a start countdown', () => {
  assert.equal(at('14:44:59').target.seconds, 1);
  assert.equal(at('14:44:59').current.key, 'dhuhr');
});
test('at the start minute, move to Jamaat rather than a negative countdown', () => {
  const value = at('14:45:00');
  assert.equal(value.current.key, 'asr');
  assert.equal(value.target.kind, 'jamaat');
  assert.equal(value.target.seconds, 900);
  assert.equal(value.adhanActive, true);
});
test('at Jamaat, show a time notice, not an invented prayer duration', () => {
  const value = at('15:00:00');
  assert.equal(value.phase, 'jamaat-now');
  assert.equal(value.notice.name, 'Asr');
  assert.equal(value.target, null);
});
test('same-time Maghrib skips a misleading Adhan wait', () => {
  const value = at('16:36:00');
  assert.equal(value.phase, 'jamaat-now');
  assert.equal(value.notice.name, 'Maghrib');
  assert.equal(value.adhanActive, false);
});
test('after a short Jamaat-time notice, count to the next prayer start', () => {
  assert.equal(at('16:37:01').target.name, 'Isha');
  assert.equal(at('16:37:01').target.kind, 'start');
});
test('Fajr highlight ends at published sunrise', () => {
  assert.equal(at('06:59:59').current.key, 'fajr');
  assert.equal(at('07:00:00').current, null);
  assert.equal(at('07:00:00').target.name, 'Dhuhr');
});
test('before Fajr, do not infer last nights Isha from todays row', () => {
  assert.equal(at('03:00:00').current, null);
  assert.equal(at('03:00:00').target.name, 'Fajr');
});
test('a stale dated row is never presented as today', () => {
  const value = at('14:48:41', { todaysTimes: row('2026-11-02') });
  assert.equal(value.available, false);
  assert.equal(value.current, null);
  assert.equal(value.target, null);
});
test('tomorrow alone cannot establish todays prayer status', () => {
  const value = at('21:00:00', { todaysTimes: null, tomorrowsTimes: row('2026-11-04') });
  assert.equal(value.available, false);
  assert.equal(value.target, null);
});
test('after Isha, uses the exact published next-day Fajr start', () => {
  const value = at('21:00:00', { tomorrowsTimes: { ...row('2026-11-04'), fajr: '05:24' } });
  assert.equal(value.target.name, 'Fajr');
  assert.equal(value.target.tomorrow, true);
  assert.equal(value.target.seconds, 30240);
});
test('missing tomorrow shows waiting, not todays Fajr reused', () => {
  assert.equal(at('21:00:00').phase, 'waiting');
  assert.equal(at('21:00:00').target, null);
});
test('a wrong next-day date is rejected', () => {
  assert.equal(at('21:00:00', { tomorrowsTimes: row('2026-11-05') }).target, null);
});
test('missing Isha cannot imply todays complete schedule has finished', () => {
  const value = at('21:00:00', { todaysTimes: { ...row(), isha: null }, tomorrowsTimes: row('2026-11-04') });
  assert.equal(value.target, null);
});
test('spring DST countdown is based on London instants, not 24 hours', () => {
  const value = prayerDisplayState({ todaysTimes: row('2026-03-28'), tomorrowsTimes: { ...row('2026-03-29'), fajr: '05:20' } }, new Date('2026-03-28T23:00:00Z'));
  assert.equal(value.target.seconds, 19200);
});
test('autumn DST countdown includes the repeated hour', () => {
  const value = prayerDisplayState({ todaysTimes: row('2026-10-24'), tomorrowsTimes: { ...row('2026-10-25'), fajr: '05:30' } }, new Date('2026-10-24T22:00:00Z'));
  assert.equal(value.target.seconds, 27000);
});
test('ambiguous and nonexistent London wall clocks are not guessed', () => {
  assert.equal(londonWallInstant('2026-10-25', '01:30'), null);
  assert.equal(londonWallInstant('2026-03-29', '01:30'), null);
});
test('Friday uses the next published Jummah session instead of daily Dhuhr Jamaat', () => {
  const value = prayerDisplayState({ todaysTimes: row('2026-11-06'), jummahTimes: [{ prayer: '12:30', khutbah: '12:15' }, { prayer: '13:30', khutbah: '13:15' }] }, new Date('2026-11-06T12:50:00Z'));
  assert.equal(value.current.key, 'dhuhr');
  assert.equal(value.target.name, 'Jummah 2');
  assert.equal(value.target.seconds, 2400);
});
test('unpublished Friday sessions do not fall back to a guessed congregation', () => {
  const value = prayerDisplayState({ todaysTimes: row('2026-11-06') }, new Date('2026-11-06T12:50:00Z'));
  assert.equal(value.target.name, 'Asr');
  assert.equal(value.target.kind, 'start');
});
test('invalid dates, invalid clocks and absent data fail closed', () => {
  for (const day of ['2026-02-31', 'not-a-date', null]) assert.equal(londonWallInstant(day, '05:30'), null);
  for (const clock of ['24:00', '12:70', '13:30 PM', '0:30 AM', 'TBC', {}, null]) assert.equal(londonWallInstant('2026-11-03', clock), null);
  assert.equal(prayerDisplayState(null, new Date()).available, false);
  assert.equal(prayerDisplayState({ todaysTimes: row() }, new Date('invalid')).available, false);
});
test('12-hour and 24-hour published times resolve to the same instant', () => {
  assert.equal(londonWallInstant('2026-11-03', '3:00 PM'), londonWallInstant('2026-11-03', '15:00'));
  assert.equal(londonWallInstant('2026-11-03', '12:00 AM'), Date.parse('2026-11-03T00:00:00Z'));
});
test('countdown formatting handles empty and non-finite values safely', () => {
  for (const value of [NaN, Infinity, -2, undefined]) assert.equal(countdownText(value), '00:00:00');
  assert.equal(countdownText(3661), '01:01:01');
});
test('calculation does not mutate timetable data', () => {
  const today = Object.freeze(row());
  const data = Object.freeze({ todaysTimes: today, jummahTimes: Object.freeze([]) });
  assert.equal(prayerDisplayState(data, new Date('2026-11-03T14:48:41Z')).target.seconds, 679);
  assert.equal(today.asr, '14:45');
});
