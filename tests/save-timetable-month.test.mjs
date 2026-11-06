import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyDetailWrites, saveMonthlyDetails } from '../src/lib/saveTimetableMonth.js';
import { parseTimetablePaste } from '../src/lib/timetablePaste.js';

const date = '2026-11-06';
const baseline = {
  [date]: {
    sunset: '16:30',
    zawwal_start: '11:46',
    zawwal_end: '',
    source: 'Approved November timetable',
    published: true,
    revision: 2,
  },
};
test('monthly Zawal edits preserve Sunset and source and send the loaded revision', () => {
  const [write] = monthlyDetailWrites(baseline, { [date]: { zawwal_start: '11:47' } }, '', true);
  assert.equal(write.p_sunset, '16:30');
  assert.equal(write.p_source, baseline[date].source);
  assert.equal(write.p_expected_revision, 2);
  assert.equal(write.p_zawwal_start, '11:47');
  assert.equal(write.p_published, true);
});
test('new published additional times require a source; drafts remain unpublished', () => {
  assert.throws(() => monthlyDetailWrites({}, { [date]: { sunset: '16:30' } }, '', true), /source/);
  assert.throws(
    () => monthlyDetailWrites(baseline, { [date]: { sunset: '4: PM' } }, '', true),
    /AM or PM/,
  );
  assert.equal(
    monthlyDetailWrites({}, { [date]: { sunset: '16:30' } }, '', false)[0].p_published,
    false,
  );
});
test('partial monthly saves acknowledge only confirmed dates and preserve remaining edits for retry', async () => {
  const writes = monthlyDetailWrites(
    {},
    { [date]: { sunset: '16:30' }, '2026-11-07': { sunset: '16:28' } },
    'Approved sheet',
    true,
  );
  const saved = [];
  const client = {
    rpc: async (name, payload) => {
      assert.equal(name, 'save_prayer_day_details');
      return payload.p_date === date
        ? {
            data: {
              d_date: date,
              sunset: payload.p_sunset,
              source: payload.p_source,
              published: true,
              revision: 1,
            },
          }
        : { error: { message: 'Another editor changed this date. Reload first.' } };
    },
  };
  await assert.rejects(
    saveMonthlyDetails(client, writes, (...args) => saved.push(args)),
    /2026-11-07.*Another editor/,
  );
  assert.equal(saved.length, 1);
  assert.equal(saved[0][0], date);
  assert.equal(saved[0][1].revision, 1);
});
test('a mismatched save receipt never clears an admin draft', async () => {
  const writes = monthlyDetailWrites(baseline, { [date]: { sunset: '16:31' } }, '', true);
  const saved = [];
  await assert.rejects(
    saveMonthlyDetails(
      { rpc: async () => ({ data: { d_date: date, revision: 2 } }) },
      writes,
      (row) => saved.push(row),
    ),
    /not be confirmed/,
  );
  assert.equal(saved.length, 0);
});
test('spreadsheet pastes import additional times with AM/PM alongside prayers', () => {
  const pasted =
    'date,fajr_begins,fajr_jamah,sunrise,zawal,zuhr_begins,zuhr_jamah,asr_begins,asr_jamah,maghrib_begins,isha_begins,isha_jamah,sunset\n6,5:39 AM,6:30 AM,7:13 AM,11:46 AM,11:56 AM,1:00 PM,2:39 PM,3:15 PM,4:32 PM,6:19 PM,7:30 PM,4:30 PM';
  const result = parseTimetablePaste(pasted, '2026-11');
  assert.deepEqual(result.details[date], { zawwal_start: '11:46', sunset: '16:30' });
  assert.equal(result.rows[0].asr_jamah, '15:15');
});
