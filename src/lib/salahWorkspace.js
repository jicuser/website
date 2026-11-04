function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function publishedSalahDates(rows) {
  return [
    ...new Set((Array.isArray(rows) ? rows : []).map((row) => row?.isoDate).filter(validDate)),
  ].sort();
}

export function selectedSalahDate(dates, selected, today) {
  if (dates.includes(selected)) return selected;
  return dates.includes(today) ? today : dates[0] || today;
}

/** Monday-first calendar; unavailable days cannot invent a timetable. */
export function salahCalendar(month) {
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month) || !validDate(`${month}-01`))
    return [];
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  return [
    ...Array(offset).fill(null),
    ...Array.from(
      { length: count },
      (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
    ),
  ];
}

export function salahDateLabel(date, monthOnly = false) {
  if (!validDate(date)) return '';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    ...(monthOnly
      ? { month: 'long', year: 'numeric' }
      : { weekday: 'short', day: 'numeric', month: 'long' }),
  });
}

export function salahIslamicDate(date) {
  if (!validDate(date)) return '';
  try {
    return (
      new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
        .format(new Date(`${date}T12:00:00Z`))
        .replace(/(?:\s*AH)+$/, '') + ' AH'
    );
  } catch {
    return '';
  }
}
