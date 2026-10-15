import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPrayerSnapshot, prayerQueryRange } from '../src/lib/prayerSnapshot.js';

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
