import React from 'react';
import { displayTime } from '@/lib/timetable';
import { currentPrayer } from '@/lib/currentPrayer';
import { nextPrayer } from '@/lib/nextPrayer';
const prayers = [
  ['Fajr', 'fajr'],
  ['Sunrise', 'sunrise'],
  ['Dhuhr', 'dhuhr'],
  ['Asr', 'asr'],
  ['Maghrib', 'maghrib'],
  ['Isha', 'isha'],
];
export default function PrayerWidget({ kind, prayers: data, now, layout = 'horizontal' }) {
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
  const current = currentPrayer(data.todaysTimes, now);
  return (
    <div className={`scene-timetable ${layout === 'vertical' ? 'is-vertical' : ''}`}>
      <div className="scene-timetable-prayers">
        {prayers.map(([name, key]) => (
          <div
            key={key}
            className={current?.key === key ? 'is-current' : ''}
            aria-current={current?.key === key ? 'time' : undefined}
          >
            <span>{name}</span>
            <strong>{displayTime(data.todaysTimes?.[key])}</strong>
            <small>
              Jama‘ah {key === 'sunrise' ? '—' : displayTime(data.todaysTimes?.[`jamaah_${key}`])}
            </small>
          </div>
        ))}
      </div>
      {data.jummahTimes?.length > 0 && (
        <div className="scene-jummah-row">
          {data.jummahTimes.slice(0, 2).map((item, index) => (
            <span key={item.name || index}>
              {item.name || `Jummah ${index + 1}`} <strong>{displayTime(item.prayer)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
