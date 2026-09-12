import { tvScene } from '../../supabase/functions/_shared/tv.js';
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
    tvScene(settings, now.getTime()) === 'class'
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
  if (screenId === 'shoe-area' || tvScene(settings, now.getTime()) === 'class') return null;
  return ['jummah', 'taraweeh'].includes(settings.notice_mode) ? settings.notice_mode : null;
}

export function ramadanScene(now, times, screenId = '') {
  if (screenId === 'shoe-area' || !times) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  if (times.d_date !== `${parts.year}-${parts.month}-${parts.day}`) return null;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const isha = prayerMinutes(times.jamaah_isha);
  return isha !== null && minute >= isha + 20 && minute < isha + 40 ? 'taraweeh' : 'fasting';
}

// Normal follows the mosque's London date. Staff can adjust the lunar calendar locally.
export function automaticTvNotice(now, times, jummah = [], settings = {}, screenId = '') {
  const scene = tvScene(settings, now.getTime());
  if (screenId === 'shoe-area' || !['normal', 'ramadan'].includes(scene)) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  if (times?.d_date !== `${parts.year}-${parts.month}-${parts.day}`) return null;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  if (settings.auto_jummah !== false && parts.weekday === 'Fri') {
    const starts = jummah
      .map((item) => prayerMinutes(item.prayer))
      .filter((value) => value !== null);
    if (starts.length && minute >= Math.min(...starts) - 60 && minute < Math.max(...starts) + 20)
      return 'jummah';
  }
  const calendar = settings.ramadan_calendar || 'auto';
  const adjusted = new Date(now.getTime() + (settings.calendar_offset || 0) * 86400000);
  const month = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
    timeZone: 'Europe/London',
    month: 'numeric',
  })
    .formatToParts(adjusted)
    .find((part) => part.type === 'month')?.value;
  if (calendar === 'on' || (calendar !== 'off' && (Number(month) === 9 || scene === 'ramadan')))
    return ramadanScene(now, times, screenId);
  return null;
}

// After iftar, display the next dated record, including month/year boundaries.
export function fastingTimes(now, today, tomorrow) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  if (today?.d_date !== date) return null;
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  const sunset = prayerMinutes(today.maghrib);
  if (sunset === null) return null;
  if (prayerMinutes(clock) < sunset) return { ...today, label: 'Today' };
  const next = new Date(date + 'T12:00:00Z');
  next.setUTCDate(next.getUTCDate() + 1);
  return tomorrow?.d_date === next.toISOString().slice(0, 10)
    ? { ...tomorrow, label: 'Tomorrow' }
    : null;
}
