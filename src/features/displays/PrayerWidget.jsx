import React from 'react';
import { displayTime } from '@/lib/timetable';
import { nextPrayer } from '@/lib/nextPrayer';
const prayers = [
  ['Fajr', 'fajr'],
  ['Sunrise', 'sunrise'],
  ['Dhuhr', 'dhuhr'],
  ['Asr', 'asr'],
  ['Maghrib', 'maghrib'],
  ['Isha', 'isha'],
];
export default function PrayerWidget({ kind, prayers: data, now }) {
  if (kind === 'next') {
    const next = nextPrayer(data.todaysTimes, now);
    return (
      <div className="scene-next">
        {next ? (
          <>
            <strong>
              Next: {next.name} · {displayTime(next.time)}
            </strong>
            <span>
              {Math.floor(next.minutesLeft / 60) > 0
                ? `${Math.floor(next.minutesLeft / 60)}h `
                : ''}
              {next.minutesLeft % 60}m remaining
            </span>
          </>
        ) : (
          <span>Timetable unavailable</span>
        )}
      </div>
    );
  }
  return (
    <div className="scene-timetable">
      {prayers.map(([name, key]) => (
        <div key={key}>
          <span>{name}</span>
          <strong>{displayTime(data.todaysTimes?.[key])}</strong>
          <small>
            Jama‘ah {key === 'sunrise' ? '—' : displayTime(data.todaysTimes?.[`jamaah_${key}`])}
          </small>
        </div>
      ))}
    </div>
  );
}
