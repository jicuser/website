import React from 'react';
import { ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react';
import HomePrayerExtras from '@/components/home/HomePrayerExtras';
import { compactTime, prayerColumns } from '@/lib/homePrayerView';
import { prayerDisplayState, londonDay, countdownText } from '@/lib/prayerDisplayState';
import { sunriseStatus } from '@/lib/sunriseStatus';
import { salahDateLabel } from '@/lib/salahWorkspace';

export default function SalahDailyCard({
  row,
  date,
  now,
  tomorrow,
  jummahTimes = [],
  summary = true,
}) {
  const isToday = date === londonDay(now);
  const state = isToday
    ? prayerDisplayState({ todaysTimes: row, tomorrowsTimes: tomorrow, jummahTimes }, now)
    : null;
  const target = state?.target;
  const shuroq = sunriseStatus(date, row?.sunrise, now);
  const currentText = state?.current
    ? `Currently ${state.current.name} time`
    : shuroq.phase === 'active'
      ? 'Prohibited time · Shuroq'
      : shuroq.phase === 'passed'
        ? 'Shuroq period passed'
        : 'Today’s timetable';
  const CurrentIcon = state?.current ? CheckCircle2 : Clock3;
  const columns = prayerColumns(row, date, jummahTimes, isToday);
  if (!row)
    return (
      <p className="salah-empty" role="status">
        No published timetable for this day.
      </p>
    );
  return (
    <section className="salah-daily-card" aria-label={`${salahDateLabel(date)} prayer times`}>
      {summary && isToday && state?.available && (
        <div className="salah-live-summary" aria-label="Current prayer and next event">
          <div className="salah-current">
            <span>
              <CurrentIcon size={14} aria-hidden="true" /> {currentText}
            </span>
            <span className="salah-clock">
              Now{' '}
              <time dateTime={now.toISOString()}>
                {now.toLocaleTimeString('en-GB', {
                  timeZone: 'Europe/London',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </span>
          </div>
          {target ? (
            <div className="salah-next">
              <div>
                <span className="salah-next-label">
                  <ArrowUpRight size={14} aria-hidden="true" /> Next up
                  {target.tomorrow ? ' · Tomorrow' : ''}
                </span>
                <h2>
                  {target.name}
                  {target.kind === 'jamaat' ? ' Jamaat' : ''}
                </h2>
                <p>
                  {target.kind === 'start' ? 'Starts' : 'Jamaat'} <b>{compactTime(target.time)}</b>
                  {target.kind === 'start' && target.congregationTime && (
                    <>
                      {' '}
                      · Jamaat <b>{compactTime(target.congregationTime)}</b>
                    </>
                  )}
                </p>
              </div>
              <div className="salah-countdown">
                <span>{target.kind === 'start' ? 'Starts in' : 'Jamaat in'}</span>
                <time role="timer" aria-live="off" aria-label={`Time until ${target.label}`}>
                  {countdownText(target.seconds)}
                </time>
              </div>
            </div>
          ) : state.phase === 'jamaat-now' ? (
            <p className="salah-jamaat-notice" role="status">
              {state.notice.name} Jamaat time · Please silence your phone.
            </p>
          ) : (
            <p className="salah-jamaat-notice">Next prayer time is not yet published.</p>
          )}
        </div>
      )}
      <table className="salah-daily-table">
        <caption className="sr-only">
          {salahDateLabel(date)}: prayer starts and Jamaat times, 24-hour clock
        </caption>
        <thead>
          <tr>
            <th scope="col">Prayer</th>
            <th scope="col">Starts</th>
            <th scope="col">Jamaat</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((prayer) => {
            const current = state?.current?.key === prayer.key;
            const upcoming = !target?.tomorrow && target?.key === prayer.key;
            return (
              <tr
                key={prayer.key}
                data-current={current || undefined}
                data-upcoming={(upcoming && !current) || undefined}
                aria-current={current ? 'time' : undefined}
              >
                <th scope="row">
                  {prayer.name}
                  {current ? (
                    <small>Current prayer</small>
                  ) : upcoming ? (
                    <small>Next prayer</small>
                  ) : null}
                </th>
                <td
                  data-next-event={
                    (upcoming &&
                      target.kind === 'start' &&
                      compactTime(target.time) === compactTime(prayer.begins)) ||
                    undefined
                  }
                >
                  {compactTime(prayer.begins)}
                </td>
                <td
                  data-next-event={
                    (upcoming &&
                      target.kind === 'jamaat' &&
                      compactTime(target.time) === compactTime(prayer.jamaat)) ||
                    undefined
                  }
                >
                  <strong>{compactTime(prayer.jamaat)}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <HomePrayerExtras compact showSource date={date} sunrise={row.sunrise} now={now} />
    </section>
  );
}
