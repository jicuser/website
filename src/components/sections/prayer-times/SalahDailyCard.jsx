import React from 'react';
import PrayerClock from '@/components/PrayerClock';
import { displayLondonClock } from '@/lib/timetable';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react';
import HomePrayerExtras from '@/components/home/HomePrayerExtras';
import { compactTime, prayerColumns } from '@/lib/homePrayerView';
import { prayerDisplayState, londonDay, countdownText } from '@/lib/prayerDisplayState';
import { sunriseStatus } from '@/lib/sunriseStatus';
import { salahDateLabel } from '@/lib/salahWorkspace';
import { resolveJummah } from '@/lib/jummahSchedule';

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
              Now <time dateTime={now.toISOString()}>{displayLondonClock(now)}</time>
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
                  {target.kind === 'start' ? 'Starts' : 'Jamaat'}{' '}
                  <b>
                    <PrayerClock value={target.time} />
                  </b>
                  {target.kind === 'start' && target.congregationTime && (
                    <>
                      {' '}
                      · Jamaat{' '}
                      <b>
                        <PrayerClock value={target.congregationTime} />
                      </b>
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
          {salahDateLabel(date)}: prayer starts and Jamaat times, 12-hour clock, AM/PM
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
            const upcoming = !prayer.friday && !target?.tomorrow && target?.key === prayer.key;
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
                  <PrayerClock value={prayer.begins} />
                </td>
                <td
                  data-next-event={
                    (upcoming &&
                      target.kind === 'jamaat' &&
                      compactTime(target.time) === compactTime(prayer.jamaat)) ||
                    undefined
                  }
                >
                  <strong>
                    {prayer.friday ? (
                      <span className="salah-friday-reference">Jummah below</span>
                    ) : (
                      <PrayerClock value={prayer.jamaat} />
                    )}
                  </strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {columns.some((prayer) => prayer.friday) && (
        <section className="salah-jummah" id="jummah-times" aria-label="Jummah prayer times">
          <h2>Jummah</h2>
          <dl>
            {[1, 2].map((number) => {
              const time =
                row[`jummah_${number}_jamah`] || (isToday ? jummahTimes[number - 1]?.prayer : null);
              return (
                <div key={number} data-upcoming={target?.name === `Jummah ${number}` || undefined}>
                  <dt>{number === 1 ? '1st' : '2nd'} Jamaat</dt>
                  <dd>
                    <PrayerClock value={time} />
                  </dd>
                </div>
              );
            })}
          </dl>
          <details>
            <summary>Khutbah &amp; visiting</summary>
            {resolveJummah(row)
              .filter((session) => session.khutbah)
              .map((session) => (
                <p key={session.number}>
                  {session.name} khutbah{' '}
                  <strong>
                    <PrayerClock value={session.khutbah} />
                  </strong>
                </p>
              ))}
            <p>Please arrive early for the khutbah and silence your phone.</p>
            <Link to="/contact">Plan your visit</Link>
          </details>
        </section>
      )}
      <HomePrayerExtras
        compact
        showSource
        date={date}
        sunrise={row.sunrise}
        maghrib={row.maghrib}
        now={now}
      />
    </section>
  );
}
