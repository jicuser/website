import test from 'node:test';
import assert from 'node:assert/strict';
import { compactTime, selectedPrayerRow, prayerColumns } from '../src/lib/homePrayerView.js';
const today = {
  d_date: '2026-11-03',
  fajr: '5:34 AM',
  sunrise: '7:05 AM',
  dhuhr: '11:56 AM',
  asr: '2:44 PM',
  maghrib: '4:37 PM',
  isha: '6:24 PM',
  jamaah_fajr: '6:15 AM',
  jamaah_dhuhr: '1:00 PM',
  jamaah_asr: '3:30 PM',
  jamaah_maghrib: '4:37 PM',
  jamaah_isha: '7:30 PM',
};
test('compact clocks preserve afternoon and midnight without cramped AM/PM labels', () => {
  assert.equal(compactTime('4:37 PM'), '16:37');
  assert.equal(compactTime('12:05 AM'), '00:05');
  assert.equal(compactTime('12:05 PM'), '12:05');
  assert.equal(compactTime('06:15:00'), '06:15');
});
test('invalid and missing times are never shown as valid', () => {
  for (const value of [null, undefined, '', 'TBC', '24:30', '13:00 PM', '0:15 AM', '6:99'])
    assert.equal(compactTime(value), '—');
});
test('missing publication returns an empty state, not a five-dash timetable', () => {
  assert.equal(selectedPrayerRow([], null, '2026-11-03', '2026-11-03'), null);
  assert.equal(
    selectedPrayerRow([], { ...today, d_date: '2026-11-02' }, '2026-11-03', '2026-11-03'),
    null,
  );
});
test('today fallback requires a correctly dated row and does not leak into another day', () => {
  assert.equal(selectedPrayerRow([], today, '2026-11-03', '2026-11-03'), today);
  assert.equal(selectedPrayerRow([], today, '2026-11-04', '2026-11-03'), null);
});
test('monthly row used for display and highlight is the same dated publication', () => {
  const result = selectedPrayerRow(
    [
      {
        isoDate: '2026-11-04',
        fajr_begins: '05:36',
        fajr_jamah: '06:20',
        sunrise: '07:07',
        zuhr_begins: '11:55',
        zuhr_jamah: '13:00',
      },
    ],
    today,
    '2026-11-04',
    '2026-11-03',
  );
  assert.equal(result.d_date, '2026-11-04');
  assert.equal(result.fajr, '05:36');
  assert.equal(result.jamaah_fajr, '06:20');
  assert.equal(result.sunrise, '07:07');
});
test('only the current prayer is emphasised, not two competing gold columns', () => {
  const cols = prayerColumns(today, '2026-11-03', [], true);
  assert.equal(cols.length, 5);
  assert.equal(cols[3].key, 'maghrib');
  assert.equal(cols[4].jamaat, '7:30 PM');
});
test('Friday keeps the Dhuhr start but never mislabels one Jummah as its daily congregation', () => {
  const row = { ...today, d_date: '2026-11-06', jummah_1_jamah: '12:35', jummah_2_jamah: '13:30' };
  const column = prayerColumns(row, row.d_date, [{ prayer: '12:35' }], true)[1];
  assert.equal(column.name, 'Dhuhr');
  assert.equal(column.friday, true);
  assert.equal(column.begins, today.dhuhr);
  assert.equal(column.jamaat, null);
});
