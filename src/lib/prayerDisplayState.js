/**
 * Shared, read-only presentation state for the website/PWA and TV timetable.
 * All times come from explicitly dated published rows; this is not a prayer-time
 * calculator or a determination of religious prayer windows.
 */
const ZONE = 'Europe/London';
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const PRAYERS = [
  ['fajr', 'Fajr'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha'],
];
const unavailable = () => ({
  available: false,
  phase: 'unavailable',
  current: null,
  target: null,
  notice: null,
  adhanActive: false,
});
const parts = (instant) =>
  Object.fromEntries(
    clock
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]),
  );
const partsAsUTC = (p) => Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const instant = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === day;
}

function minutes(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}

export function londonDay(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const p = parts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Resolve a London wall-clock value without the computer's local timezone.
 * A missing or repeated clock time at a DST transition is deliberately rejected.
 */
export function londonWallInstant(day, value) {
  const minute = minutes(value);
  if (!validDay(day) || minute === null) return null;
  const target = Date.parse(`${day}T00:00:00Z`) + minute * 60000;
  const offsets = new Set(
    [-12, 0, 12].map((hours) => {
      const sample = target + hours * 3600000;
      return partsAsUTC(parts(sample)) - sample;
    }),
  );
  const matches = [...offsets]
    .map((offset) => target - offset)
    .filter((candidate) => partsAsUTC(parts(candidate)) === target);
  return matches.length === 1 ? matches[0] : null;
}

function nextDay(day) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function countdownText(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function eventsForDay(row, sessions, friday) {
  return PRAYERS.flatMap(([key, name]) => {
    const begins = londonWallInstant(row.d_date, row[key]);
    const regularJamaat = londonWallInstant(row.d_date, row[`jamaah_${key}`]);
    const publishedSessions =
      key === 'dhuhr' && friday
        ? (Array.isArray(sessions) ? sessions : []).map((session, index) => ({
            key,
            name: `Jummah ${session.number || index + 1}`,
            kind: 'jamaat',
            time: session?.prayer,
            at: londonWallInstant(row.d_date, session?.prayer),
            beginsTime: session?.khutbah || null,
            congregationTime: session?.prayer,
          }))
        : [
            {
              key,
              name,
              kind: 'jamaat',
              time: row[`jamaah_${key}`],
              at: regularJamaat,
              beginsTime: row[key],
              congregationTime: row[`jamaah_${key}`],
            },
          ];
    // An invalid Jamaat earlier than the published start is not presented as valid.
    const congregations = publishedSessions.filter(
      (event) => event.at !== null && (begins === null || event.at >= begins),
    );
    const start =
      begins === null
        ? []
        : [
            {
              key,
              name,
              kind: 'start',
              at: begins,
              time: row[key],
              beginsTime: row[key],
              congregationTime: key === 'dhuhr' && friday ? null : congregations[0]?.time || null,
            },
          ];
    return [...start, ...congregations];
  }).sort((a, b) => a.at - b.at || (a.kind === 'jamaat' ? -1 : 1));
}

function targetFor(event, now, tomorrow = false) {
  return {
    ...event,
    tomorrow,
    seconds: Math.max(0, Math.ceil((event.at - now) / 1000)),
    label: event.kind === 'start' ? `${event.name} begins` : `${event.name} Jamaat`,
  };
}

export function prayerDisplayState(data, now = new Date()) {
  const day = londonDay(now);
  const row = data?.todaysTimes;
  if (!day || !row || row.d_date !== day) return unavailable();
  const instant = now.getTime();
  const friday = new Date(`${day}T12:00:00Z`).getUTCDay() === 5;
  const events = eventsForDay(row, data.jummahTimes, friday);
  if (!events.length) return unavailable();
  const starts = events.filter((event) => event.kind === 'start');
  const currentStart = starts.filter((event) => event.at <= instant).at(-1) || null;
  const sunrise = londonWallInstant(day, row.sunrise);
  // Sunrise is displayed separately; it never has a congregation or active row.
  const current =
    currentStart?.key === 'fajr' && (sunrise === null || instant >= sunrise) ? null : currentStart;
  const result = {
    available: true,
    date: day,
    phase: 'waiting',
    current,
    target: null,
    notice: null,
    adhanActive: false,
  };

  // This is a one-minute "Jamaat time" notice, not an assumed prayer duration.
  // The TV's existing configured prayer-in-progress schedule remains authoritative.
  const justStarted = events
    .filter((event) => event.kind === 'jamaat' && event.at <= instant && instant < event.at + 60000)
    .at(-1);
  if (justStarted) return { ...result, phase: 'jamaat-now', notice: justStarted };

  const upcoming = events.find(
    (event) => event.at > instant && !(friday && event.key === 'dhuhr' && event.kind === 'start'),
  );
  if (upcoming) {
    const adhanActive = Boolean(
      currentStart &&
      instant < currentStart.at + 120000 &&
      upcoming.kind === 'jamaat' &&
      upcoming.key === currentStart.key,
    );
    return {
      ...result,
      phase: upcoming.kind === 'start' ? 'before-start' : 'before-jamaat',
      target: targetFor(upcoming, instant),
      adhanActive,
    };
  }

  // Only a complete, finished Isha record allows a next-day rollover.
  const ishaBegins = londonWallInstant(day, row.isha);
  const ishaJamaat = londonWallInstant(day, row.jamaah_isha);
  const tomorrow = data?.tomorrowsTimes;
  if (
    ishaBegins === null ||
    ishaJamaat === null ||
    ishaJamaat < ishaBegins ||
    instant < ishaJamaat ||
    tomorrow?.d_date !== nextDay(day)
  )
    return result;
  const fajr = londonWallInstant(tomorrow.d_date, tomorrow.fajr);
  if (fajr === null || fajr <= instant) return result;
  return {
    ...result,
    phase: 'before-start',
    target: targetFor(
      {
        key: 'fajr',
        name: 'Fajr',
        kind: 'start',
        at: fajr,
        time: tomorrow.fajr,
        beginsTime: tomorrow.fajr,
        congregationTime: tomorrow.jamaah_fajr || null,
      },
      instant,
      true,
    ),
  };
}
