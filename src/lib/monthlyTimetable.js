import { displayTime, displayZawal } from './timetable.js';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateFields = new Set(['dayName', 'day']);
const compactTime = (value) => value.replace(/\s[AP]M$/, '');

export function recordDate(record) {
  const value = String(record.isoDate || record.d_date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
  }
  // Older public records used a display date, e.g. "13 Sep 2026".
  const legacy = value.match(
    /^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) (\d{4})$/i,
  );
  if (legacy) {
    const date = new Date(`${value} 12:00:00 GMT`);
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    if (
      date.getUTCDate() === Number(legacy[1]) &&
      date.getUTCMonth() === months.indexOf(legacy[2].slice(0, 3).toLowerCase()) &&
      date.getUTCFullYear() === Number(legacy[3])
    )
      return date.toISOString().slice(0, 10);
  }
  return '';
}

function prayerGroup(key, label, arabic, combined = false) {
  return {
    key,
    label,
    arabic,
    columns: [
      { key: `${key}_begins`, label: combined ? 'Adhan' : 'Start' },
      ...(!combined ? [{ key: `${key}_jamah`, label: 'Jamat' }] : []),
    ],
  };
}

// The page and both image formats use the same values, columns and ditto rules.
export function buildMonthlyTimetable(inputRows = []) {
  const records = inputRows.map((record, index) => ({
    record,
    index,
    isoDate: recordDate(record),
  }));
  records.sort((a, b) => {
    if (a.isoDate && b.isoDate) return a.isoDate.localeCompare(b.isoDate);
    if (a.isoDate) return -1;
    if (b.isoDate) return 1;
    return a.index - b.index;
  });
  const combinedMaghrib =
    records.length > 0 &&
    records.every(({ record }) => {
      const begins = displayTime(record.maghrib_begins);
      return begins !== '—' && begins === displayTime(record.maghrib_jamah);
    });
  const groups = [
    {
      key: 'date',
      label: 'Date',
      columns: [
        { key: 'dayName', label: 'Day' },
        { key: 'day', label: 'Date' },
      ],
    },
    prayerGroup('fajr', 'Fajr', 'فجر'),
    {
      key: 'sunrise',
      label: 'Sunrise',
      single: true,
      columns: [{ key: 'sunrise', label: 'Sunrise' }],
    },
    ...(records.some(({ record }) => record.zawwal_start)
      ? [
          {
            key: 'zawal',
            label: 'Zawal',
            single: true,
            columns: [{ key: 'zawal', label: 'Zawal' }],
          },
        ]
      : []),
    prayerGroup('zuhr', 'Dhuhr', 'ظهر'),
    prayerGroup('asr', 'Asr', 'عصر'),
    prayerGroup('maghrib', 'Maghrib', 'مغرب', combinedMaghrib),
    prayerGroup('isha', 'Isha', 'عشاء'),
  ];
  const columns = groups.flatMap((group) =>
    group.columns.map((column) => ({ ...column, group: group.key })),
  );
  const rows = records.map(({ record, isoDate }, index) => {
    const date = isoDate ? new Date(`${isoDate}T12:00:00Z`) : null;
    const previous = records[index - 1];
    const consecutive = Boolean(
      isoDate &&
      previous?.isoDate &&
      isoDate.slice(0, 7) === previous.isoDate.slice(0, 7) &&
      Date.parse(isoDate) - Date.parse(previous.isoDate) === 86400000,
    );
    const dayName = date ? weekdays[date.getUTCDay()] : record.dayName || '—';
    const day = date ? date.getUTCDate() : (record.day ?? '—');
    const cells = columns.map(({ key }) => {
      if (dateFields.has(key)) {
        const value = String(key === 'day' ? day : dayName);
        return { key, value, display: value, repeated: false };
      }
      if (key === 'zawal')
        return {
          key,
          value: displayZawal(record),
          display: displayZawal(record, (time) => compactTime(displayTime(time))),
          repeated: false,
        };
      if (key === 'zuhr_jamah' && dayName === 'Fri')
        return {
          key,
          value: 'Jummah: see Friday sessions below',
          display: 'Jummah',
          repeated: false,
        };
      const value = displayTime(record[key]);
      const repeated =
        consecutive &&
        !(key === 'zuhr_jamah' && new Date(`${previous?.isoDate}T12:00:00Z`).getUTCDay() === 5) &&
        value !== '—' &&
        (key.endsWith('_jamah') || key === 'zuhr_begins') &&
        value === displayTime(previous.record[key]);
      return { key, value, display: repeated ? '"' : compactTime(value), repeated };
    });
    return {
      isoDate,
      day,
      dayName,
      isFriday: date ? date.getUTCDay() === 5 : dayName === 'Fri',
      cells,
      jummah: [displayTime(record.jummah_1_jamah), displayTime(record.jummah_2_jamah)],
    };
  });
  return { groups, columns, rows, combinedMaghrib };
}
