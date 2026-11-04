import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publishedSalahDates,
  selectedSalahDate,
  salahCalendar,
  salahIslamicDate,
} from '../src/lib/salahWorkspace.js';

test('calendar dates come only from valid dated publications, sorted and without duplicates', () => {
  assert.deepEqual(
    publishedSalahDates([
      { isoDate: '2026-11-05' },
      null,
      { isoDate: '2026-11-04' },
      { isoDate: '2026-11-04' },
      { isoDate: '2026-02-30' },
      { isoDate: '2026-13-04' },
      {},
    ]),
    ['2026-11-04', '2026-11-05'],
  );
  assert.deepEqual(publishedSalahDates(null), []);
});

test('selection preserves a published day and recovers safely when publication changes', () => {
  const dates = ['2026-11-04', '2026-11-05'];
  assert.equal(selectedSalahDate(dates, '2026-11-05', '2026-11-04'), '2026-11-05');
  assert.equal(selectedSalahDate(dates, '2026-11-03', '2026-11-04'), '2026-11-04');
  assert.equal(selectedSalahDate(dates, '2026-11-03', '2026-11-06'), '2026-11-04');
  assert.equal(selectedSalahDate([], '2026-11-03', '2026-11-04'), '2026-11-04');
});

test('Monday-first calendar aligns November 2026 and handles leap years without invented dates', () => {
  const november = salahCalendar('2026-11');
  assert.deepEqual(november.slice(0, 6), Array(6).fill(null));
  assert.equal(november[6], '2026-11-01');
  assert.equal(november[9], '2026-11-04');
  assert.equal(november.at(-1), '2026-11-30');
  assert.equal(salahCalendar('2028-02').filter(Boolean).length, 29);
  assert.equal(salahCalendar('2027-02').filter(Boolean).length, 28);
  assert.deepEqual(salahCalendar('2026-13'), []);
});

test('Islamic date agrees with the existing homepage calendar rather than differing by a day', () => {
  const expected =
    new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
      .format(new Date('2026-11-04T12:00:00Z'))
      .replace(/(?:\s*AH)+$/, '') + ' AH';
  assert.equal(salahIslamicDate('2026-11-04'), expected);
  assert.match(salahIslamicDate('2026-11-04'), /^24 /);
  assert.equal(salahIslamicDate('2026-02-30'), '');
});
