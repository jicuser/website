import React from 'react';
import { displayTime } from '@/lib/timetable';
import { currentPrayer } from '@/lib/currentPrayer';
import { tvNextCongregation, countdownParts } from '@/lib/tvCountdown';

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

function JummahRow({ data, current }) {
  if (!data.jummahTimes?.length) return null;
  return (
    <div className="scene-jummah-row">
      {data.jummahTimes.slice(0, 2).map((item, index) => (
        <span
          key={item.name || index}
          className={current?.name === `Jummah ${index + 1}` ? 'is-current' : ''}
        >
          <span className="scene-jummah-name">{item.name || `Jummah ${index + 1}`}</span>
          <strong>{displayTime(item.prayer)}</strong>
        </span>
      ))}
    </div>
  );
}

function PrayerTable({ data, current, compact = false, showTomorrow = false }) {
  return (
    <div
      className={`scene-prayer-table ${compact ? 'is-compact' : ''} ${showTomorrow ? 'has-tomorrow' : ''} ${data.jummahTimes?.length ? 'has-jummah' : ''}`}
    >
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
            {!compact && (
              <small lang="ar" dir="rtl">
                {arabic}
              </small>
            )}
          </span>
          <strong>{displayTime(data.todaysTimes?.[key])}</strong>
          <strong>{jamaah(data, key)}</strong>
          {showTomorrow && <strong>{displayTime(data.tomorrowsTimes?.[key])}</strong>}
        </div>
      ))}
      <JummahRow data={data} current={current} />
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
          hour12: true,
        })}
      </strong>
      <span>{current?.name || 'Salah'}</span>
    </div>
  );
}

export default function PrayerWidget({
  kind,
  prayers: data,
  now,
  layout = 'horizontal',
  highlightNext = false,
}) {
  const next = kind === 'next' || highlightNext ? tvNextCongregation(data, now) : null;
  if (kind === 'next') {
    return (
      <div className="scene-next">
        {next ? (
          <>
            <p className="scene-next-label">
              {next.tomorrow ? 'Tomorrow’s first jama’ah' : 'Next jama’ah'}
            </p>
            <strong className="scene-next-heading">
              {next.name} <span>· {displayTime(next.time)}</span>
            </strong>
            <div
              className="scene-countdown"
              aria-label={`${countdownParts(next.seconds).join(':')} until jama’ah`}
            >
              {countdownParts(next.seconds).map((value, index) => (
                <span key={index}>
                  <b>{value}</b>
                  <small>{['Hours', 'Minutes', 'Seconds'][index]}</small>
                </span>
              ))}
            </div>
            <span className="scene-next-detail">
              {next.seconds === 0
                ? 'Jama’ah now'
                : `${Math.floor(next.seconds / 3600)}h ${Math.floor((next.seconds % 3600) / 60)}m until jama’ah`}
            </span>
          </>
        ) : (
          <span>Awaiting the next published jama’ah time</span>
        )}
      </div>
    );
  }

  const current = highlightNext
    ? next?.tomorrow
      ? null
      : next
    : currentPrayer(data.todaysTimes, now);

  if (layout === 'clock-table')
    return (
      <div className="scene-salah-board">
        <ClockFace now={now} current={current} />
        <PrayerTable data={data} current={current} showTomorrow />
      </div>
    );

  if (layout === 'compact' || layout === 'vertical')
    return <PrayerTable data={data} current={current} compact={layout === 'compact'} />;

  return (
    <div className={`scene-timetable ${data.jummahTimes?.length ? 'has-jummah' : ''}`}>
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
      <JummahRow data={data} current={current} />
    </div>
  );
}
