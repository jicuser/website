import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPrayerSnapshot, prayerQueryRange } from '../src/lib/prayerSnapshot.js';
import { prayerPublication } from '../src/lib/prayerPublication.js';
import { publishedSalahDates, selectedSalahDate } from '../src/lib/salahWorkspace.js';

test('timetable range includes next Friday and tomorrow across month/year boundaries', () => {
  assert.deepEqual(prayerQueryRange('2026-01-31', true), {
    monthStart: '2026-01-01',
    monthEnd: '2026-01-31',
    friday: '2026-02-06',
    tomorrow: '2026-02-01',
    last: '2026-02-06',
  });
  assert.equal(prayerQueryRange('2027-12-31', true).last, '2028-01-01');
  assert.equal(prayerQueryRange('2028-02-29').monthEnd, '2028-02-29');
});

test('public calendar can opt into the complete following month across year and leap boundaries', () => {
  assert.equal(prayerQueryRange('2026-11-25', true).monthEnd, '2026-11-30');
  assert.deepEqual(prayerQueryRange('2026-11-25', true, true), {
    monthStart: '2026-11-01',
    monthEnd: '2026-12-31',
    friday: '2026-11-27',
    tomorrow: '2026-11-26',
    last: '2026-12-31',
  });
  assert.equal(prayerQueryRange('2026-12-31', true, true).monthEnd, '2027-01-31');
  assert.equal(prayerQueryRange('2028-01-31', true, true).monthEnd, '2028-02-29');
});

test('one timetable query supplies all views, plus one settings query, without pulling another month into the calendar', async () => {
  const requests = [];
  const rows = [
    { d_date: '2026-01-31', fajr_begins: '06:00' },
    { d_date: '2026-02-01', fajr_begins: '05:59' },
    { d_date: '2026-02-06', jummah_1_jamah: '13:30' },
  ];
  const signal = new AbortController().signal;
  const client = {
    from(table) {
      const request = { table };
      requests.push(request);
      const chain = {
        select(columns) {
          request.columns = columns;
          return chain;
        },
        gte(column, date) {
          request.first = date;
          return chain;
        },
        lte(column, date) {
          request.last = date;
          return chain;
        },
        order() {
          return chain;
        },
        eq() {
          return chain;
        },
        maybeSingle() {
          return chain;
        },
        abortSignal(value) {
          assert.equal(value, signal);
          return chain;
        },
        then(resolve) {
          resolve({ data: table === 'prayer_times' ? rows : { content_value: '{}' }, error: null });
        },
      };
      return chain;
    },
  };
  const data = await loadPrayerSnapshot(client, '2026-01-31', true, signal);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].first, '2026-01-01');
  assert.equal(requests[0].last, '2026-02-06');
  assert.doesNotMatch(requests[0].columns, /\*/);
  assert.equal(data.daily.data, rows[0]);
  assert.deepEqual(data.monthly.data, [rows[0]]);
  assert.equal(data.nextDay.data, rows[1]);
  assert.equal(data.fridayRow.data, rows[2]);
});

test('November public calendar exposes published December dates without changing today, tomorrow or next Jummah', async () => {
  const requests = [];
  const rows = [
    { d_date: '2026-11-01', fajr_begins: '05:30' },
    { d_date: '2026-11-25', fajr_begins: '06:01' },
    { d_date: '2026-11-26', fajr_begins: '06:02' },
    { d_date: '2026-11-27', fajr_begins: '06:03', jummah_1_jamah: '12:35' },
    { d_date: '2026-11-30', fajr_begins: '06:06' },
    { d_date: '2026-12-01', fajr_begins: '06:07' },
    { d_date: '2026-12-31', fajr_begins: '06:29' },
    { d_date: '2027-01-01', fajr_begins: '06:29' },
  ];
  const client = {
    from(table) {
      const request = { table };
      requests.push(request);
      const query = {
        select() {
          return query;
        },
        gte(column, date) {
          request.first = date;
          return query;
        },
        lte(column, date) {
          request.last = date;
          return query;
        },
        order() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return query;
        },
        then(resolve) {
          resolve({ data: table === 'prayer_times' ? rows : { content_value: '{}' }, error: null });
        },
      };
      return query;
    },
  };
  const snapshot = await loadPrayerSnapshot(client, '2026-11-25', true, undefined, true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].first, '2026-11-01');
  assert.equal(requests[0].last, '2026-12-31');
  assert.equal(snapshot.daily.data, rows[1]);
  assert.equal(snapshot.nextDay.data, rows[2]);
  assert.equal(snapshot.fridayRow.data, rows[3]);
  assert.deepEqual(snapshot.monthly.data, rows.slice(0, -1));

  const dates = publishedSalahDates(prayerPublication(snapshot, '2026-11-25').monthlyPrayerTimes);
  assert.deepEqual([...new Set(dates.map((date) => date.slice(0, 7)))], ['2026-11', '2026-12']);
  assert.equal(selectedSalahDate(dates, '2026-12-01', '2026-11-25'), '2026-12-01');
  assert.ok(dates.includes('2026-12-31'));
  assert.ok(!dates.includes('2027-01-01'));

  const withoutTomorrow = await loadPrayerSnapshot(client, '2026-11-25', false, undefined, true);
  assert.equal(withoutTomorrow.nextDay.data, null);
  assert.deepEqual(withoutTomorrow.monthly.data, snapshot.monthly.data);
});
