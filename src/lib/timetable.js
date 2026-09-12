export const prayerFields = [
  ['fajr_begins', 'Fajr begins'],
  ['fajr_jamah', 'Fajr Jama’ah'],
  ['sunrise', 'Sunrise'],
  ['zuhr_begins', 'Dhuhr begins'],
  ['zuhr_jamah', 'Dhuhr Jama’ah'],
  ['asr_begins', 'Asr begins'],
  ['asr_jamah', 'Asr Jama’ah'],
  ['maghrib_begins', 'Maghrib begins'],
  ['maghrib_jamah', 'Maghrib Jama’ah'],
  ['isha_begins', 'Isha begins'],
  ['isha_jamah', 'Isha Jama’ah'],
];
export const jummahFields = [
  ['jummah_1_start', 'First khutbah'],
  ['jummah_1_jamah', 'First Jama’ah'],
  ['jummah_2_begins', 'Second khutbah'],
  ['jummah_2_jamah', 'Second Jama’ah'],
];
export const defaultJummah = {
  jummah_1_start: '13:30',
  jummah_1_jamah: '13:30',
  jummah_2_begins: '14:30',
  jummah_2_jamah: '14:30',
};
export const londonDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
// Database values can be 24-hour times; public prayer data may already include AM/PM.
export function displayTime(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return '—';
  const hour = Number(match[1]),
    minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return '—';
  const suffix = match[3]?.toUpperCase() || (hour >= 12 ? 'PM' : 'AM');
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

function cells(text) {
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('A quoted CSV field is not closed.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function parseTimetable(text) {
  const lines = cells(text.replace(/^\uFEFF/, ''));
  if (lines.length < 2) throw new Error('Choose a CSV with a header and at least one date.');
  const aliases = { date: 'd_date', dhuhr_begins: 'zuhr_begins', dhuhr_jamah: 'zuhr_jamah' };
  const headers = lines.shift().map((s) => {
    const k = s.toLowerCase().replace(/\s+/g, '_');
    return aliases[k] || k;
  });
  const required = ['d_date', ...prayerFields.map(([k]) => k)];
  const missing = required.filter((k) => !headers.includes(k));
  if (missing.length)
    throw new Error(`Missing columns: ${missing.join(', ')}. Download the template below.`);
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate column names.');
  const allowed = new Set([...required, ...jummahFields.map(([k]) => k), 'is_ramadan']);
  const unknown = headers.filter((k) => !allowed.has(k));
  if (unknown.length) throw new Error(`Unrecognised columns: ${unknown.join(', ')}`);
  if (lines.length > 366) throw new Error('Upload up to 366 dates at once.');
  const seen = new Set();
  return lines
    .map((values, i) => {
      if (values.length !== headers.length)
        throw new Error(`Row ${i + 2}: number of values does not match the header.`);
      const row = Object.fromEntries(headers.map((h, j) => [h, values[j]]));
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(row.d_date))
        row.d_date = row.d_date.split('/').reverse().join('-');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(row.d_date) ||
        Number.isNaN(Date.parse(row.d_date)) ||
        new Date(row.d_date).toISOString().slice(0, 10) !== row.d_date
      )
        throw new Error(`Row ${i + 2}: use a real date in YYYY-MM-DD or DD/MM/YYYY format.`);
      if (seen.has(row.d_date)) throw new Error(`Duplicate date: ${row.d_date}`);
      seen.add(row.d_date);
      for (const [k] of [...prayerFields, ...jummahFields]) {
        if (!(k in row)) continue;
        if (!row[k]) {
          if (required.includes(k)) throw new Error(`Row ${i + 2}: ${k} is empty.`);
          row[k] = null;
          continue;
        }
        if (!/^(?:[01]?\d|2[0-3]):[0-5]\d(?::00)?$/.test(row[k]))
          throw new Error(`Row ${i + 2}: ${k} must use 24-hour time, e.g. 13:30.`);
        row[k] = row[k]
          .split(':')
          .slice(0, 2)
          .map((s) => s.padStart(2, '0'))
          .join(':');
      }
      const ramadan = String(row.is_ramadan || 'false').toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(ramadan))
        throw new Error(`Row ${i + 2}: is_ramadan must be true or false.`);
      row.is_ramadan = ['true', '1', 'yes'].includes(ramadan);
      return row;
    })
    .sort((a, b) => a.d_date.localeCompare(b.d_date));
}
