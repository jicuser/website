import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimetablePaste } from '../src/lib/timetablePaste.js';

const line = '1\t05:31\t06:15\t07:04\t11:46\t11:56\t13:00\t14:48\t15:30\t16:41\t18:27\t19:30';
test('printed order imports starts, Jamaat and separate Zawal without publishing fields to prayer rows', () => {
  const result = parseTimetablePaste(line, '2026-11');
  assert.equal(result.rows[0].d_date, '2026-11-01');
  assert.equal(result.rows[0].maghrib_jamah, '16:41');
  assert.equal(result.rows[0].zuhr_begins, '11:56');
  assert.equal(result.details['2026-11-01'].zawwal_start, '11:46');
  assert.equal(result.rows[0].zawwal_start, undefined);
});
test('spreadsheet ditto marks resolve against the preceding row', () => {
  const second = line
    .split('\t')
    .map((cell, i) => (i === 0 ? '2' : '"'))
    .join('\t');
  const result = parseTimetablePaste(`${line}\n${second}`, '2026-11');
  assert.equal(result.rows[1].fajr_jamah, '06:15');
  assert.equal(result.details['2026-11-02'].zawwal_start, '11:46');
});
test('bad times, impossible dates and wrong-month dates are rejected before staging', () => {
  assert.throws(() => parseTimetablePaste(line.replace('05:31', '25:31'), '2026-11'));
  assert.throws(() => parseTimetablePaste(line.replace(/^1/, '31'), '2026-11'));
  assert.throws(() => parseTimetablePaste(line.replace(/^1/, '2026-12-01'), '2026-11'));
});
test('named CSV and tab-separated templates produce the same draft', () => {
  const headers =
    'date,fajr_begins,fajr_jamah,sunrise,zawal,zuhr_begins,zuhr_jamah,asr_begins,asr_jamah,maghrib_begins,isha_begins,isha_jamah';
  assert.deepEqual(
    parseTimetablePaste(`${headers}\n${line.replaceAll('\t', ',')}`, '2026-11'),
    parseTimetablePaste(`${headers.replaceAll(',', '\t')}\n${line}`, '2026-11'),
  );
});
