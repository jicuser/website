function minutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}

const prayers = [
  ['Fajr', 'fajr'],
  ['Dhuhr', 'dhuhr'],
  ['Asr', 'asr'],
  ['Maghrib', 'maghrib'],
  ['Isha', 'isha'],
];

export function currentPrayer(times, date = new Date()) {
  if (!times || !Number.isFinite(date.getTime())) return null;
  const now = minutes(
    date.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  );
  const schedule = prayers.map(([name, key]) => ({ name, key, start: minutes(times[key]) }));
  const active = [...schedule]
    .reverse()
    .find((prayer) => prayer.start !== null && prayer.start <= now);
  if (active?.key === 'fajr') {
    const sunrise = minutes(times.sunrise);
    if (sunrise !== null && now >= sunrise) return null;
  }
  if (active) return active;
  // Before today's Fajr, the overnight highlight belongs to Isha.
  const fajr = schedule[0];
  const isha = schedule[4];
  return fajr.start !== null && now < fajr.start && isha.start !== null ? isha : null;
}
