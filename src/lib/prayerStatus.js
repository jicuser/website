/** Pure helpers shared by compact prayer interfaces. All clocks are Europe/London. */
export const DAILY_PRAYERS = [
  ['Fajr', 'fajr_begins', 'fajr_jamah', 'sunrise'],
  ['Dhuhr', 'zuhr_begins', 'zuhr_jamah', 'asr_begins'],
  ['Asr', 'asr_begins', 'asr_jamah', 'maghrib_begins'],
  ['Maghrib', 'maghrib_begins', 'maghrib_jamah', 'isha_begins'],
  ['Isha', 'isha_begins', 'isha_jamah', null],
];
export function timeMinutes(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::[0-5]\d)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}
export function londonClock(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return { date: '', minutes: NaN };
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
export function prayerStatus(row, minutes, { previous = null, tomorrow = null, friday = false, jummah = [] } = {}) {
  const result = { current: null, nextJamaah: null };
  if (!row || !Number.isFinite(minutes) || minutes < 0 || minutes >= 1440) return result;
  for (const [name, startKey, , endKey] of DAILY_PRAYERS) {
    const start = timeMinutes(row[startKey]);
    const end = endKey ? timeMinutes(row[endKey]) : 1440;
    if (start !== null && end !== null && start < end && minutes >= start && minutes < end) result.current = name;
  }
  const dawn = timeMinutes(row.fajr_begins);
  if (dawn !== null && minutes < dawn && timeMinutes(previous?.isha_begins) !== null) result.current = 'Isha';
  const candidates = DAILY_PRAYERS.flatMap(([name, , key]) => {
    if (friday && name === 'Dhuhr') return [];
    const at = timeMinutes(row[key]);
    return at !== null && at >= minutes ? [{ name, time: row[key], minutesAway: at - minutes, tomorrow: false }] : [];
  });
  if (friday && Array.isArray(jummah)) jummah.slice(0, 2).forEach((time, index) => {
    const at = timeMinutes(time);
    if (at !== null && at >= minutes) candidates.push({ name: `Jummah ${index + 1}`, time, minutesAway: at - minutes, tomorrow: false });
  });
  candidates.sort((a, b) => a.minutesAway - b.minutesAway);
  result.nextJamaah = candidates[0] || null;
  if (!result.nextJamaah) {
    const at = timeMinutes(tomorrow?.fajr_jamah);
    if (at !== null) result.nextJamaah = { name: 'Fajr', time: tomorrow.fajr_jamah, minutesAway: 1440 - minutes + at, tomorrow: true };
  }
  return result;
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
/** Prefer the mosque's supplied Hijri calendar rather than a calculated substitute. */
export function timetableHijriLabel(metadata, isoDate) {
  if (!validDate(isoDate) || !metadata || !Number.isInteger(metadata.year) || !Array.isArray(metadata.segments)) return '';
  const segment = metadata.segments.find((item) => item && validDate(item.from) && validDate(item.to) && isoDate >= item.from && isoDate <= item.to);
  if (!segment || !Number.isInteger(segment.day) || typeof segment.month !== 'string' || segment.month.length > 60) return '';
  const day = segment.day + Math.round((Date.parse(isoDate) - Date.parse(segment.from)) / 86400000);
  return day >= 1 && day <= 30 ? `${day} ${segment.month} ${metadata.year} AH` : '';
}
