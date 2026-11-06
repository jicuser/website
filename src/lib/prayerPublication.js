import { displayTime } from './timetable.js';
import { isFriday, resolveJummah, jummahFieldsFor, parseJummahSettings } from './jummahSchedule.js';

export function prayerPublication(snapshot, today) {
  const weekly = parseJummahSettings(
    snapshot.settings?.error ? null : snapshot.settings?.data?.content_value,
  );
  const effective = (row) =>
    row && {
      ...row,
      ...(isFriday(row.d_date)
        ? jummahFieldsFor(resolveJummah(row, row.d_date >= today ? weekly : {}))
        : {}),
    };
  const day = (raw) => {
    const row = effective(raw);
    if (!row) return null;
    const result = { ...row, ...jummahFieldsFor(resolveJummah(row, {})) };
    for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const field = key === 'dhuhr' ? 'zuhr' : key;
      result[key] = displayTime(row[`${field}_begins`]);
      result[`jamaah_${key}`] =
        key === 'dhuhr' && isFriday(row.d_date) ? null : displayTime(row[`${field}_jamah`]);
    }
    result.sunrise = displayTime(row.sunrise);
    return result;
  };
  return {
    todaysTimes: day(snapshot.daily?.error ? null : snapshot.daily?.data),
    tomorrowsTimes: day(snapshot.nextDay?.error ? null : snapshot.nextDay?.data),
    monthlyPrayerTimes: (snapshot.monthly?.error ? [] : snapshot.monthly?.data || []).map((raw) => {
      const row = effective(raw);
      const date = new Date(`${row.d_date}T12:00:00Z`);
      return {
        ...row,
        isoDate: row.d_date,
        day: date.getUTCDate(),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
      };
    }),
    jummahTimes: resolveJummah(snapshot.fridayRow?.error ? null : snapshot.fridayRow?.data, weekly),
    weeklyJummahTimes: resolveJummah(null, weekly),
  };
}
