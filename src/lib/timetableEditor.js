import { prayerFields, jummahFields } from './timetable.js';
export function monthDates(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month.');
  const [year, number] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
export function monthDraft(month, records = []) {
  return monthDates(month).map((d_date) => {
    const original = records.find((row) => row.d_date === d_date) || {};
    return {
      d_date,
      ...Object.fromEntries(
        [...prayerFields, ...jummahFields].map(([key]) => [key, original[key]?.slice(0, 5) || '']),
      ),
      is_ramadan: Boolean(original.is_ramadan),
    };
  });
}
export function applyJamaahRange(rows, key, time, start, end) {
  if (!prayerFields.some(([field]) => field === key && field.endsWith('_jamah')))
    throw new Error('Choose a Jama’ah time.');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid time.');
  if (!rows.some((r) => r.d_date === start) || !rows.some((r) => r.d_date === end) || start > end)
    throw new Error('Choose a valid date range in this month.');
  return rows.map((row) =>
    row.d_date >= start && row.d_date <= end ? { ...row, [key]: time } : row,
  );
}
export function validateMonth(rows) {
  for (const row of rows)
    for (const [key, label] of [...prayerFields, ...jummahFields]) {
      if (!row[key] && !prayerFields.some(([field]) => field === key)) continue;
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row[key] || ''))
        throw new Error(`${row.d_date}: enter ${label}.`);
    }
  return rows.map((row) => ({
    ...row,
    ...Object.fromEntries(jummahFields.map(([key]) => [key, row[key] || null])),
  }));
}
