const prayers = [
  ['Fajr', 'fajr'],
  ['Dhuhr', 'dhuhr'],
  ['Asr', 'asr'],
  ['Maghrib', 'maghrib'],
  ['Isha', 'isha'],
];

function minutes(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}

// Congregations remain upcoming after the prayer's start time. On Friday,
// use the published Jummah sessions instead of the ordinary Dhuhr congregation.
// Never carry yesterday's data forward or guess tomorrow's timetable.
export function nextCongregation(times, jummahTimes = [], date = new Date()) {
  if (!times || Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  if (times.d_date && times.d_date !== day) return null;
  const now = minutes(
    date.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  );
  const friday =
    date.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
    }) === 'Fri';
  const fridaySessions = jummahTimes
    .map((session, index) => ({ ...session, name: `Jummah ${index + 1}` }))
    .filter((session) => minutes(session.prayer) !== null);
  const candidates = prayers.flatMap(([name, key]) => {
    if (key === 'dhuhr' && friday && fridaySessions.length) {
      return fridaySessions.map((session) => ({
        name: session.name,
        time: session.prayer,
        begins: session.khutbah,
        beginsLabel: 'Khutbah',
      }));
    }
    return [
      { name, time: times[`jamaah_${key}`], begins: times[key], beginsLabel: 'Salah begins' },
    ];
  });
  return (
    candidates
      .map((item) => ({ ...item, at: minutes(item.time) }))
      .filter((item) => item.at !== null && item.at >= now)
      .sort((a, b) => a.at - b.at)[0] || null
  );
}
