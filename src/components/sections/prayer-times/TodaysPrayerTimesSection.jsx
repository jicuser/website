import React from 'react';

import { currentPrayer } from '@/lib/currentPrayer';

export default function TodaysPrayerTimesSection({ currentDate, todaysTimes }) {
  if (!todaysTimes)
    return (
      <section className="py-6 px-4 text-center">
        Today's timetable is unavailable. Please contact the centre.
      </section>
    );
  const rows = [
    ['Fajr', 'fajr'],
    ['Sunrise', 'sunrise'],
    ['Dhuhr', 'dhuhr'],
    ['Asr', 'asr'],
    ['Maghrib', 'maghrib'],
    ['Isha', 'isha'],
  ];
  const current = currentPrayer(todaysTimes, currentDate);
  return (
    <section className="jic-prayer-schedule mx-auto max-w-4xl px-4 py-6">
      <div className="jic-prayer-table overflow-x-auto rounded-2xl border">
        <table className="w-full text-left">
          <caption className="sr-only">Today's prayer start and congregation times</caption>
          <thead>
            <tr>
              <th scope="col">Prayer</th>
              <th scope="col">Starts</th>
              <th scope="col">Jama‘ah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, key]) => (
              <tr
                key={key}
                className={current?.key === key ? 'is-current' : ''}
                aria-current={current?.key === key ? 'time' : undefined}
              >
                <th scope="row">{name}</th>
                <td>{todaysTimes[key]}</td>
                <td>{todaysTimes[`jamaah_${key}`] || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
