import { buildMonthlyTimetable } from './monthlyTimetable.js';
import { displayTime } from './timetable.js';
export function timetablePresentation(rows, options = {}) {
  const table = buildMonthlyTimetable(rows);
  const start = Number(options.hijriDay),
    length = Number(options.hijriLength || 30);
  const withHijri =
    Number.isInteger(start) && start >= 1 && start <= length && [29, 30].includes(length);
  const offset = Number(options.zawalOffset);
  const withZawal =
    options.zawalOffset !== '' &&
    options.zawalOffset != null &&
    Number.isInteger(offset) &&
    offset >= 0 &&
    offset <= 60;
  if (withHijri)
    table.groups.splice(1, 0, {
      key: 'hijri',
      label: 'Hijri',
      single: true,
      columns: [{ key: 'hijri', label: 'Hijri' }],
    });
  if (withZawal)
    table.groups.splice(
      table.groups.findIndex((g) => g.key === 'zuhr'),
      0,
      { key: 'zawal', label: 'Zawal', single: true, columns: [{ key: 'zawal', label: 'Zawal' }] },
    );
  table.columns = table.groups.flatMap((group) =>
    group.columns.map((column) => ({ ...column, group: group.key })),
  );
  table.rows = table.rows.map((row) => {
    const cells = new Map(row.cells.map((cell) => [cell.key, cell]));
    if (withHijri) {
      const value = String(((start + Number(row.day) - 2) % length) + 1);
      cells.set('hijri', { key: 'hijri', display: value, value });
    }
    if (withZawal) {
      const value = cells.get('zuhr_begins')?.value || '';
      const match = value.match(/^(\d+):(\d+) (AM|PM)$/);
      let display = '—';
      if (match) {
        const minutes =
          (((Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0)) * 60 +
            Number(match[2]) -
            offset +
            1440) %
          1440;
        display = displayTime(
          `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
        ).replace(/ (AM|PM)$/, '');
      }
      cells.set('zawal', { key: 'zawal', display, value: display });
    }
    return { ...row, cells: table.columns.map((c) => cells.get(c.key)) };
  });
  return table;
}
