// Timings are measured from the congregation start, using the mosque's London clock.
export function prayerMinutes(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}
export function tvPrayerSequence(now, times, jummah = [], settings = {}, screenId = '') {
  if (
    screenId === 'shoe-area' ||
    !times ||
    settings.prayer_enabled === false ||
    Date.parse(settings.class_until) > now.getTime()
  )
    return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  if (times.d_date !== date) return null;
  const minute = Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
  const prayers = [
    ['Fajr', 'fajr'],
    ['Dhuhr', 'dhuhr'],
    ['Asr', 'asr'],
    ['Maghrib', 'maghrib'],
    ['Isha', 'isha'],
  ]
    .filter(([, key]) => key !== 'dhuhr' || parts.weekday !== 'Fri')
    .map(([name, key]) => ({ name, key, time: times[`jamaah_${key}`] }));
  if (parts.weekday === 'Fri')
    prayers.push(...jummah.map((item) => ({ name: item.name, key: 'jummah', time: item.prayer })));
  const current = prayers
    .map((prayer) => ({ ...prayer, start: prayerMinutes(prayer.time) }))
    .filter(
      (prayer) => prayer.start !== null && minute >= prayer.start && minute < prayer.start + 20,
    )
    .sort((a, b) => b.start - a.start)[0];
  if (!current) return null;
  const elapsed = minute - current.start;
  const delay = current.key === 'maghrib' ? 10 : 5;
  return {
    ...current,
    phase: elapsed < delay ? 'jamaah' : 'dhikr',
    dhikrSeconds: Math.max(0, Math.floor((elapsed - delay) * 60)),
  };
}

// Manual seasonal notices yield to class mode and never appear in the shoe area.
export function tvSpecialNotice(now, settings = {}, screenId = '') {
  if (screenId === 'shoe-area' || Date.parse(settings.class_until) > now.getTime()) return null;
  return ['jummah', 'taraweeh'].includes(settings.notice_mode) ? settings.notice_mode : null;
}
