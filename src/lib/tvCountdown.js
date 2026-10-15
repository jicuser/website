import { nextCongregation } from './nextCongregation.js';

const londonDay = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
const clockParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

// Resolve the mosque's wall clock to an instant, including the night when the
// clocks change. Adding 24 hours to today's Fajr would give the wrong answer.
function londonInstant(day, minutes) {
  const target = Date.parse(`${day}T00:00:00Z`) + minutes * 60000;
  let instant = target;
  for (let pass = 0; pass < 3; pass++) {
    const p = Object.fromEntries(
      clockParts.formatToParts(instant).map(({ type, value }) => [type, value]),
    );
    const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    instant += target - local;
  }
  return instant;
}

export function tvNextCongregation(data = {}, now = new Date()) {
  if (!Number.isFinite(now.getTime())) return null;
  const today = londonDay(now);
  // Tomorrow alone cannot establish that all of today's congregations passed.
  if (data.todaysTimes?.d_date !== today) return null;
  const nextDate = new Date(`${today}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const tomorrow = nextDate.toISOString().slice(0, 10);
  const current = nextCongregation(data.todaysTimes, data.jummahTimes, now);
  if (
    !current &&
    !nextCongregation(
      { d_date: today, jamaah_isha: data.todaysTimes.jamaah_isha },
      [],
      new Date(londonInstant(today, 0)),
    )
  )
    return null;
  const next =
    current ||
    (data.tomorrowsTimes?.d_date === tomorrow
      ? nextCongregation(
          data.tomorrowsTimes,
          data.jummahTimes,
          new Date(londonInstant(tomorrow, 0)),
        )
      : null);
  if (!next || (!current && next.name !== 'Fajr')) return null;
  const key = next.name.startsWith('Jummah') ? 'jummah' : next.name.toLowerCase();
  const at = londonInstant(current ? today : tomorrow, next.at);
  return {
    ...next,
    key,
    tomorrow: !current,
    seconds: Math.max(0, Math.ceil((at - now.getTime()) / 1000)),
  };
}

export function countdownParts(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map((part) =>
    String(part).padStart(2, '0'),
  );
}
