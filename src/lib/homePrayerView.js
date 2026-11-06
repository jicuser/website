import { displayTime } from './timetable.js';
import { normalizeClock } from './clockTime.js';

const PRAYERS = [
  ['fajr', 'Fajr', 'fajr_begins', 'fajr_jamah'],
  ['dhuhr', 'Dhuhr', 'zuhr_begins', 'zuhr_jamah'],
  ['asr', 'Asr', 'asr_begins', 'asr_jamah'],
  ['maghrib', 'Maghrib', 'maghrib_begins', 'maghrib_jamah'],
  ['isha', 'Isha', 'isha_begins', 'isha_jamah'],
];

/** Public clock times consistently include AM/PM; storage and comparisons remain unambiguous. */
export function compactTime(value) {
  return displayTime(normalizeClock(value));
}

/** The displayed row and live status must refer to the same dated publication. */
export function selectedPrayerRow(monthly, today, selected, todayDate) {
  const row = (Array.isArray(monthly) ? monthly : []).find((day) => day.isoDate === selected);
  if (row) {
    const result = {
      d_date: selected,
      sunrise: row.sunrise,
      jummah_1_jamah: row.jummah_1_jamah,
      jummah_2_jamah: row.jummah_2_jamah,
    };
    for (const [key, , startKey, jamaatKey] of PRAYERS) {
      result[key] = row[startKey];
      result[`jamaah_${key}`] = row[jamaatKey];
    }
    return result;
  }
  return selected === todayDate && today?.d_date === todayDate ? today : null;
}

export function prayerColumns(row, selected) {
  const friday = new Date(`${selected}T12:00:00Z`).getUTCDay() === 5;
  return PRAYERS.map(([key, name]) => ({
    key,
    name,
    begins: row?.[key],
    friday: key === 'dhuhr' && friday,
    jamaat: key === 'dhuhr' && friday ? null : row?.[`jamaah_${key}`],
  }));
}
