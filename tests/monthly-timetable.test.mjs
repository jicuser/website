import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyTimetable } from '../src/lib/monthlyTimetable.js';

const day = (isoDate, changes = {}) => ({
  isoDate,
  fajr_begins: '05:15',
  fajr_jamah: '06:00',
  sunrise: '06:35',
  zuhr_begins: '13:09',
  zuhr_jamah: '13:45',
  asr_begins: '17:29',
  asr_jamah: '18:00',
  maghrib_begins: '19:35',
  maghrib_jamah: '19:35',
  isha_begins: '20:49',
  isha_jamah: '21:15',
  ...changes,
});

const cell = (row, key) => {
  const result = row.cells.find((item) => item.key === key);
  assert.ok(result, `Missing timetable column: ${key}`);
  return result;
};

test('sorts ISO and legacy dates and derives Friday independently of supplied labels', () => {
  const input = [
    day(undefined, { d_date: '05 Sep 2026' }),
    day('2026-09-04', { day: 9, dayName: 'Mon' }),
    day(undefined, { d_date: '2026-09-03' }),
  ];
  const before = structuredClone(input);
  const { rows, columns } = buildMonthlyTimetable(input);

  assert.deepEqual(
    rows.map((row) => row.isoDate),
    ['2026-09-03', '2026-09-04', '2026-09-05'],
  );
  assert.deepEqual(
    rows.map(({ day: date, dayName, isFriday }) => [date, dayName, isFriday]),
    [
      [3, 'Thu', false],
      [4, 'Fri', true],
      [5, 'Sat', false],
    ],
  );
  for (const row of rows) {
    assert.deepEqual(
      row.cells.map((item) => item.key),
      columns.map((column) => column.key),
    );
  }
  assert.deepEqual(input, before, 'Building a display must not reorder or change source data.');
});

test('ditto marks retain the full time and only condense the approved repeated fields', () => {
  const { rows } = buildMonthlyTimetable([
    day('2026-09-03', { maghrib_jamah: '19:40' }),
    day('2026-09-04', { maghrib_jamah: '19:40' }),
  ]);
  for (const key of [
    'fajr_jamah',
    'zuhr_begins',
    'zuhr_jamah',
    'asr_jamah',
    'maghrib_jamah',
    'isha_jamah',
  ]) {
    assert.equal(cell(rows[0], key).repeated, false, `${key}: first day needs a time`);
    assert.equal(cell(rows[1], key).repeated, true, `${key}: following day can use ditto`);
    assert.equal(cell(rows[1], key).display, '"');
    assert.equal(cell(rows[1], key).value, cell(rows[0], key).value);
  }
  assert.equal(cell(rows[1], 'fajr_jamah').value, '6:00 AM');
  for (const key of ['fajr_begins', 'sunrise', 'asr_begins', 'maghrib_begins', 'isha_begins']) {
    assert.equal(cell(rows[1], key).repeated, false, `${key}: keep daily start time visible`);
    assert.notEqual(cell(rows[1], key).display, '"');
  }
});

test('normalizes equivalent time formats before comparing and shows a changed time immediately', () => {
  const { rows } = buildMonthlyTimetable([
    day('2026-09-10', { asr_jamah: '18:00:00' }),
    day('2026-09-11', { asr_jamah: '6:00 PM' }),
    day('2026-09-12', { asr_jamah: '17:45' }),
  ]);
  assert.equal(cell(rows[1], 'asr_jamah').display, '"');
  assert.equal(cell(rows[1], 'asr_jamah').value, '6:00 PM');
  assert.equal(cell(rows[2], 'asr_jamah').display, '5:45');
  assert.equal(cell(rows[2], 'asr_jamah').value, '5:45 PM');
  assert.equal(cell(rows[2], 'asr_jamah').repeated, false);
});

test('the same clock digits in AM and PM are different congregation times', () => {
  const { rows } = buildMonthlyTimetable([
    day('2026-09-01', { fajr_jamah: '06:00' }),
    day('2026-09-02', { fajr_jamah: '18:00' }),
  ]);
  assert.equal(cell(rows[0], 'fajr_jamah').value, '6:00 AM');
  assert.equal(cell(rows[1], 'fajr_jamah').value, '6:00 PM');
  assert.equal(cell(rows[1], 'fajr_jamah').display, '6:00');
  assert.equal(cell(rows[1], 'fajr_jamah').repeated, false);
});

test('a missing date resets ditto marks until consecutive dates resume', () => {
  const { rows } = buildMonthlyTimetable([day('2026-09-01'), day('2026-09-03'), day('2026-09-04')]);
  assert.deepEqual(
    rows.map((row) => cell(row, 'fajr_jamah').repeated),
    [false, false, true],
  );
  assert.equal(cell(rows[1], 'fajr_jamah').display, '6:00');
});

test('missing and malformed values remain dashes and cannot carry a ditto chain', () => {
  const { rows } = buildMonthlyTimetable([
    day('2026-09-01'),
    day('2026-09-02', { fajr_jamah: null }),
    day('2026-09-03', { fajr_jamah: 'N/A' }),
    day('2026-09-04', { fajr_jamah: '25:99' }),
    day('2026-09-05'),
    day('2026-09-06'),
  ]);
  for (const row of rows.slice(1, 4)) {
    assert.equal(cell(row, 'fajr_jamah').value, '—');
    assert.equal(cell(row, 'fajr_jamah').display, '—');
    assert.equal(cell(row, 'fajr_jamah').repeated, false);
  }
  assert.equal(cell(rows[4], 'fajr_jamah').display, '6:00');
  assert.equal(cell(rows[4], 'fajr_jamah').repeated, false);
  assert.equal(cell(rows[5], 'fajr_jamah').repeated, true);
});

test('the first day of a new month restates the time even after a matching previous day', () => {
  const { rows } = buildMonthlyTimetable([day('2026-09-30'), day('2026-10-01'), day('2026-10-02')]);
  for (const key of ['fajr_jamah', 'zuhr_begins', 'zuhr_jamah']) {
    assert.deepEqual(
      rows.map((row) => cell(row, key).repeated),
      [false, false, true],
    );
  }
});

test('Maghrib can share a column when both valid times match on every date', () => {
  const model = buildMonthlyTimetable([
    day('2026-09-01', { maghrib_begins: '19:35:00', maghrib_jamah: '7:35 PM' }),
    day('2026-09-02', { maghrib_begins: '19:33', maghrib_jamah: '19:33' }),
  ]);
  assert.equal(model.combinedMaghrib, true);
  assert.equal(model.columns.filter(({ key }) => key.startsWith('maghrib')).length, 1);
});

test('one distinct Maghrib congregation time preserves separate columns for the entire month', () => {
  const model = buildMonthlyTimetable([
    day('2026-09-01'),
    day('2026-09-02', { maghrib_jamah: '19:40' }),
  ]);
  assert.equal(model.combinedMaghrib, false);
  assert.deepEqual(
    model.columns.filter(({ key }) => key.startsWith('maghrib')).map(({ key }) => key),
    ['maghrib_begins', 'maghrib_jamah'],
  );
  assert.equal(cell(model.rows[1], 'maghrib_begins').value, '7:35 PM');
  assert.equal(cell(model.rows[1], 'maghrib_jamah').value, '7:40 PM');
});

test('unknown Maghrib times cannot be treated as matching valid times', () => {
  for (const changes of [
    { maghrib_jamah: null },
    { maghrib_begins: null, maghrib_jamah: null },
    { maghrib_begins: 'N/A', maghrib_jamah: 'N/A' },
  ]) {
    const model = buildMonthlyTimetable([day('2026-09-01'), day('2026-09-02', changes)]);
    assert.equal(model.combinedMaghrib, false);
    assert.equal(model.columns.filter(({ key }) => key.startsWith('maghrib')).length, 2);
  }
});

test('an empty timetable produces no invented rows', () => {
  assert.deepEqual(buildMonthlyTimetable([]).rows, []);
});

test('an impossible legacy date cannot move prayer times onto a different calendar date', () => {
  const { rows } = buildMonthlyTimetable([day(undefined, { d_date: '31 Feb 2026' })]);
  assert.equal(rows[0].isoDate, '');
  assert.equal(rows[0].day, '—');
  assert.equal(rows[0].dayName, '—');
  assert.equal(rows[0].isFriday, false);
});

test('accepts the UK September label and keeps valid dates sorted around malformed records', () => {
  const { rows } = buildMonthlyTimetable([
    day(undefined, { d_date: '04 Sept 2026' }),
    day(undefined, { d_date: '31 Feb 2026' }),
    day('2026-09-01'),
  ]);
  assert.deepEqual(
    rows.map((row) => row.isoDate),
    ['2026-09-01', '2026-09-04', ''],
  );
  assert.equal(cell(rows[1], 'fajr_jamah').repeated, false);
});
