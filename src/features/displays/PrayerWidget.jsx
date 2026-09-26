import React from 'react';
import { displayTime } from '@/lib/timetable';
import { currentPrayer } from '@/lib/currentPrayer';
import { nextPrayer } from '@/lib/nextPrayer';

const prayers = [
  ['Fajr', 'fajr', 'فجر'],
  ['Sunrise', 'sunrise', 'شروق'],
  ['Dhuhr', 'dhuhr', 'ظهر'],
  ['Asr', 'asr', 'عصر'],
  ['Maghrib', 'maghrib', 'مغرب'],
  ['Isha', 'isha', 'عشاء'],
];

function jamaah(data, key) {
  return key === 'sunrise' ? '—' : displayTime(data.todaysTimes?.[`jamaah_${key}`]);
}

function JummahRow({ data }) {
  if (!data.jummahTimes?.length) return null;
  return (
    <div className="scene-jummah-row">
      {data.jummahTimes.slice(0, 2).map((item, index) => (
        <span key={item.name || index}>
          {item.name || `Jummah ${index + 1}`} <strong>{displayTime(item.prayer)}</strong>
        </span>
      ))}
    </div>
  );
}

function PrayerTable({ data, current, compact = false, showTomorrow = false }) {
  return (
    <div className={`scene-prayer-table ${compact ? 'is-compact' : ''} ${showTomorrow ? 'has-tomorrow' : ''}`}>
      <div className="scene-prayer-table-head" aria-hidden="true">
        <span>Salah</span>
        <span>Start</span>
        <span>Jama‘ah</span>
        {showTomorrow && <span>Tomorrow</span>}
      </div>
      {prayers.map(([name, key, arabic]) => (
        <div
          key={key}
          className={`scene-prayer-table-row ${current?.key === key ? 'is-current' : ''}`}
          aria-current={current?.key === key ? 'time' : undefined}
        >
          <span className="scene-prayer-name">
            <b>{name}</b>
            {!compact && <small lang="ar" dir="rtl">{arabic}</small>}
          </span>
          <strong>{displayTime(data.todaysTimes?.[key])}</strong>
          <strong>{jamaah(data, key)}</strong>
          {showTomorrow && <strong>{displayTime(data.tomorrowsTimes?.[key])}</strong>}
        </div>
      ))}
      <JummahRow data={data} />
    </div>
  );
}

function ClockFace({ now, current }) {
  const london = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const hour = (london.getHours() % 12) * 30 + london.getMinutes() * 0.5;
  const minute = london.getMinutes() * 6 + london.getSeconds() * 0.1;
  return (
    <div className="scene-salah-clock">
      <div className="scene-salah-clock-face" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} style={{ '--tick': index }} />
        ))}
        <span className="scene-clock-hand is-hour" style={{ '--angle': `${hour}deg` }} />
        <span className="scene-clock-hand is-minute" style={{ '--angle': `${minute}deg` }} />
        <span className="scene-clock-pin" />
      </div>
      <strong>
        {now.toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </strong>
      <span>{current?.name || 'Salah'}</span>
    </div>
  );
}

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

  if (layout === 'clock-table')
    return (
      <div className="scene-salah-board">
        <ClockFace now={now} current={current} />
        <PrayerTable data={data} current={current} showTomorrow />
      </div>
    );

  if (layout === 'compact')
    return <PrayerTable data={data} current={current} compact />;

  if (layout === 'vertical')
    return (
      <div className="scene-timetable is-vertical">
        <div className="scene-timetable-prayers">
          {prayers.map(([name, key, arabic]) => (
            <div
              key={key}
              className={current?.key === key ? 'is-current' : ''}
              aria-current={current?.key === key ? 'time' : undefined}
            >
              <span>
                {name} <small lang="ar" dir="rtl">{arabic}</small>
              </span>
              <strong>{displayTime(data.todaysTimes?.[key])}</strong>
              <small>Jama‘ah {jamaah(data, key)}</small>
            </div>
          ))}
        </div>
        <JummahRow data={data} />
      </div>
    );

  return (
    <div className="scene-timetable">
      <div className="scene-timetable-prayers">
        {prayers.map(([name, key]) => (
          <div
            key={key}
            className={current?.key === key ? 'is-current' : ''}
            aria-current={current?.key === key ? 'time' : undefined}
          >
            <span>{name}</span>
            <strong>{displayTime(data.todaysTimes?.[key])}</strong>
            <small>Jama‘ah {jamaah(data, key)}</small>
          </div>
        ))}
      </div>
      <JummahRow data={data} />
    </div>
  );
}
