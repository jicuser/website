import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthDates,
  monthDraft,
  applyJamaahRange,
  validateMonth,
} from '../src/lib/timetableEditor.js';
import { timetablePresentation } from '../src/lib/timetablePresentation.js';
import { prayerFields } from '../src/lib/timetable.js';

test('month drafts respect calendar boundaries and retain actual stored times', () => {
  assert.equal(monthDates('2028-02').length, 29);
  assert.equal(monthDates('2026-02').length, 28);
  assert.throws(() => monthDates('2026-13'));
  const rows = monthDraft('2026-11', [
    { d_date: '2026-11-02', fajr_begins: '05:32:00', jummah_1_jamah: '12:35:00' },
  ]);
  assert.equal(rows.length, 30);
  assert.equal(rows[0].fajr_begins, '');
  assert.equal(rows[1].fajr_begins, '05:32');
  assert.equal(rows[1].jummah_1_jamah, '12:35');
});
test('batch edits affect only requested Jamaah field within inclusive dates', () => {
  const rows = monthDraft('2026-11');
  const result = applyJamaahRange(rows, 'fajr_jamah', '06:30', '2026-11-06', '2026-11-12');
  assert.equal(result.filter((r) => r.fajr_jamah === '06:30').length, 7);
  assert.equal(rows[5].fajr_jamah, '');
  assert.equal(result[5].fajr_begins, '');
  assert.throws(() =>
    applyJamaahRange(rows, 'fajr_begins', '06:30', rows[0].d_date, rows.at(-1).d_date),
  );
  assert.throws(() =>
    applyJamaahRange(rows, 'fajr_jamah', '25:00', rows[0].d_date, rows.at(-1).d_date),
  );
  assert.throws(() => applyJamaahRange(rows, 'fajr_jamah', '06:30', '2026-11-12', '2026-11-06'));
});
test('publishing blocks missing times and preserves explicit Friday overrides', () => {
  const rows = monthDraft('2026-11');
  assert.throws(() => validateMonth(rows), /Fajr begins/);
  const complete = rows.map((r) => ({
    ...r,
    ...Object.fromEntries(prayerFields.map(([k]) => [k, '12:00'])),
  }));
  complete[5].jummah_1_jamah = '12:35';
  assert.equal(validateMonth(complete)[5].jummah_1_jamah, '12:35');
  assert.equal(validateMonth(complete)[0].jummah_1_jamah, null);
});
test('print-only Hijri and Zawal columns require explicit valid settings', () => {
  const rows = [
    { d_date: '2026-11-01', zuhr_begins: '11:56' },
    { d_date: '2026-11-11', zuhr_begins: '11:57' },
  ];
  assert.ok(!timetablePresentation(rows).columns.some((c) => ['hijri', 'zawal'].includes(c.key)));
  const table = timetablePresentation(rows, {
    hijriDay: '21',
    hijriLength: '30',
    zawalOffset: '10',
  });
  assert.equal(table.rows[0].cells.find((c) => c.key === 'hijri').display, '21');
  assert.equal(table.rows[1].cells.find((c) => c.key === 'hijri').display, '1');
  assert.equal(table.rows[0].cells.find((c) => c.key === 'zawal').display, '11:46');
  assert.ok(
    !timetablePresentation(rows, { zawalOffset: 'bad' }).columns.some((c) => c.key === 'zawal'),
  );
});
