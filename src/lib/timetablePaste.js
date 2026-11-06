import { parseTimetable, timetableCells } from './timetable.js';
import { normalizeClock } from './clockTime.js';

const printedColumns = [
  'd_date',
  'fajr_begins',
  'fajr_jamah',
  'sunrise',
  'zawwal_start',
  'zuhr_begins',
  'zuhr_jamah',
  'asr_begins',
  'asr_jamah',
  'maghrib_begins',
  'isha_begins',
  'isha_jamah',
];
const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;

/** Printed-sheet order or a named CSV/Excel table, staged without publishing. */
export function parseTimetablePaste(text, month) {
  if (text.length > 2 * 1024 * 1024) throw new Error('Use a file or pasted table under 2 MB.');
  const table = text.includes('\t')
    ? text
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => line.split('\t').map((cell) => cell.trim()))
    : timetableCells(text.replace(/^\uFEFF/, ''));
  if (!table.length) throw new Error('Paste at least one day of times.');
  const header = table[0].some((cell) => /^(d_date|date|day)$/i.test(cell));
  const columns = header
    ? table.shift().map((cell) =>
        cell
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/^zawal$/, 'zawwal_start'),
      )
    : printedColumns;
  if (new Set(columns).size !== columns.length) throw new Error('Column headings must be unique.');
  const previous = {};
  const details = {};
  const rows = table.map((cells, index) => {
    if (cells.length !== columns.length)
      throw new Error(
        `Row ${index + 1}: expected ${columns.length} columns. Use the template or the printed-sheet order shown below.`,
      );
    const row = Object.fromEntries(
      columns.map((key, i) => {
        let value = cells[i];
        if (/^["”″]$/.test(value)) {
          if (!previous[key])
            throw new Error(`Row ${index + 1}: no previous value to repeat for ${key}.`);
          value = previous[key];
        }
        previous[key] = value;
        return [key, value];
      }),
    );
    row.d_date ||= row.date || row.day;
    delete row.date;
    delete row.day;
    if (/^\d{1,2}$/.test(row.d_date || '')) row.d_date = `${month}-${row.d_date.padStart(2, '0')}`;
    if (!row.d_date?.startsWith(`${month}-`))
      throw new Error(`Row ${index + 1}: choose dates inside ${month}.`);
    for (const key of ['zawwal_start', 'zawwal_end', 'sunset']) {
      if (key in row) {
        const time = row[key] ? normalizeClock(row[key]) : '';
        if (time === null)
          throw new Error(
            `Row ${index + 1}: ${key} needs a valid time with AM/PM or 24-hour time.`,
          );
        details[row.d_date] = { ...details[row.d_date], [key]: time };
      }
      delete row[key];
    }
    row.maghrib_jamah ||= row.maghrib_begins;
    return row;
  });
  if (!rows.length) throw new Error('Add at least one day below the headings.');
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const parsed = parseTimetable(
    [keys, ...rows.map((row) => keys.map((key) => row[key] ?? ''))]
      .map((row) => row.map(csv).join(','))
      .join('\n'),
  );
  return { rows: parsed, details };
}
