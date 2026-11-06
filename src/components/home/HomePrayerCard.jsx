import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  Clock3,
} from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { displayLondonClock } from '@/lib/timetable';
import PrayerClock from '@/components/PrayerClock';
import useDisplayClock from '@/hooks/useDisplayClock';
import { countdownText, londonDay, prayerDisplayState } from '@/lib/prayerDisplayState';
import { compactTime, prayerColumns, selectedPrayerRow } from '@/lib/homePrayerView';
import '@/styles/jic-prayer-modern.css';
import HomePrayerExtras from './HomePrayerExtras';
import { sunriseStatus } from '@/lib/sunriseStatus';

const dateLabel = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
const islamicLabel = (iso) => {
  try {
    return (
      new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
        .format(new Date(`${iso}T12:00:00Z`))
        .replace(/(?:\s*AH)+$/, '') + ' AH'
    );
  } catch {
    return '';
  }
};

export default function HomePrayerCard({ compact = false }) {
  const {
    monthlyPrayerTimes,
    todaysTimes,
    tomorrowsTimes,
    jummahTimes,
    jummahDate,
    isLoadingPrayerTimes,
  } = usePublicPrayerTimes();
  const now = useDisplayClock();
  const today = londonDay(now);
  const [selected, setSelected] = useState(today);
  const days = monthlyPrayerTimes || [];
  const selectedIndex = days.findIndex((day) => day.isoDate === selected);
  const isToday = selected === today;
  const row = selectedPrayerRow(days, todaysTimes, selected, today);
  const state = isToday
    ? prayerDisplayState({ todaysTimes: row, tomorrowsTimes, jummahTimes }, now)
    : null;
  const target = state?.target;
  const columns = prayerColumns(row, selected, jummahTimes, isToday);
  const sessions = (
    isToday ? jummahTimes || [] : [{ prayer: row?.jummah_1_jamah }, { prayer: row?.jummah_2_jamah }]
  )
    .map((session, index) => ({ ...session, number: index + 1 }))
    .filter((session) => compactTime(session.prayer) !== '—');
  useEffect(() => {
    setSelected(today);
  }, [today]);
  const move = (direction) => {
    const next = days[selectedIndex + direction];
    if (next) setSelected(next.isoDate);
  };
  const current = state?.current?.key;
  const shuroq = sunriseStatus(selected, row?.sunrise, now);
  const currentLabel = state?.current
    ? `Currently ${state.current.name} time`
    : shuroq.phase === 'active'
      ? 'Prohibited time · Shuroq'
      : shuroq.phase === 'passed'
        ? 'Shuroq period passed'
        : 'Today’s timetable';
  const CurrentIcon = state?.current || shuroq.phase === 'passed' ? CheckCircle2 : Clock3;
  const nextCell = (key, kind, time) =>
    !target?.tomorrow &&
    target?.key === key &&
    target.kind === kind &&
    compactTime(target.time) === compactTime(time);
  const nextColumn = columns.find(
    (prayer) =>
      nextCell(prayer.key, 'start', prayer.begins) || nextCell(prayer.key, 'jamaat', prayer.jamaat),
  )?.key;

  return (
    <aside
      className={`jic-home-prayer jic-prayer-card${compact ? ' is-compact' : ''}`}
      aria-label="Daily prayer timetable"
    >
      <header className="jic-card-heading">
        <div className="jic-card-date">
          <h2>{isToday ? 'Today’s Salah' : 'Timetable'}</h2>
          <small>
            {dateLabel(selected)} ·{' '}
            <span className="jic-card-islamic-date">{islamicLabel(selected)}</span>
          </small>
        </div>
        <div className="jic-card-date-controls" role="group" aria-label="Choose timetable day">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => move(-1)}
            disabled={selectedIndex <= 0}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <label className="jic-card-calendar">
            <CalendarDays size={18} aria-hidden="true" />
            <span className="sr-only">Choose timetable date</span>
            <input
              type="date"
              value={selected}
              min={days[0]?.isoDate || today}
              max={days.at(-1)?.isoDate || today}
              disabled={!days.length}
              onChange={(event) => {
                if (days.some((day) => day.isoDate === event.target.value))
                  setSelected(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => move(1)}
            disabled={selectedIndex < 0 || selectedIndex >= days.length - 1}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {isToday && !compact && state?.available && (
        <div
          className="jic-card-clock"
          data-sunrise-active={shuroq.phase === 'active' || undefined}
        >
          <span>
            <CurrentIcon size={13} aria-hidden="true" /> {currentLabel}
          </span>
          <span className="jic-card-clock-now">
            Current time <time>{displayLondonClock(now)}</time>
          </span>
        </div>
      )}
      {!isToday ? (
        <div className="jic-card-status jic-card-browsing">
          <span>Published timetable</span>
          <button type="button" onClick={() => setSelected(today)}>
            Back to today
          </button>
        </div>
      ) : compact && state?.available ? (
        <section className="jic-card-app-summary" aria-label="Current prayer and next event">
          <div
            className="jic-card-app-current"
            data-sunrise-active={shuroq.phase === 'active' || undefined}
          >
            <span>
              <CurrentIcon size={15} aria-hidden="true" /> {currentLabel}
            </span>
            <span className="jic-card-app-clock">
              Now <time>{displayLondonClock(now)}</time>
            </span>
          </div>
          {target ? (
            <div className="jic-card-app-next">
              <div>
                <span className="jic-card-app-label">
                  <ArrowUpRight size={14} aria-hidden="true" /> Next up
                </span>
                <strong>
                  {target.name}
                  {target.kind === 'jamaat' ? ' Jamaat' : ''}
                  {target.tomorrow ? ' · Tomorrow' : ''}
                </strong>
                <p>
                  {target.kind === 'start' ? 'Starts' : 'Jamaat'}{' '}
                  <time>
                    <PrayerClock value={target.time} />
                  </time>
                  {target.kind === 'start' && target.congregationTime && (
                    <small>
                      {' '}
                      · Jamaat{' '}
                      <time>
                        <PrayerClock value={target.congregationTime} />
                      </time>
                    </small>
                  )}
                </p>
              </div>
              <div className="jic-card-app-countdown">
                <span>{target.kind === 'start' ? 'Starts in' : 'Jamaat in'}</span>
                <time role="timer" aria-live="off" aria-label={`Time until ${target.label}`}>
                  {countdownText(target.seconds)}
                </time>
              </div>
            </div>
          ) : state.phase === 'jamaat-now' ? (
            <p className="jic-card-app-notice" role="status">
              {state.notice.name} Jamaat time · Please silence your phone.
            </p>
          ) : (
            <p className="jic-card-app-notice">Next prayer time is not yet published.</p>
          )}
        </section>
      ) : target ? (
        <section className="jic-card-status" data-next-prayer="true" aria-label="Next prayer">
          <div className="jic-card-next">
            <span className="jic-card-eyebrow">
              {target.kind === 'start' ? 'Next prayer' : 'Next Jamaat'}
              {target.tomorrow && ' · Tomorrow'}
            </span>
            <strong>
              {target.name}{' '}
              <span>
                {target.kind === 'start' ? 'Starts' : 'Jamaat'} <PrayerClock value={target.time} />
              </span>
            </strong>
            <small>
              {target.kind === 'start' && target.congregationTime ? (
                <>
                  Jamaat <PrayerClock value={target.congregationTime} />
                </>
              ) : (
                'Congregation at the masjid'
              )}
            </small>
          </div>
          <div className="jic-card-countdown">
            <span>{target.kind === 'start' ? 'Begins in' : 'Jamaat in'}</span>
            <time role="timer" aria-live="off" aria-label={`Time until ${target.label}`}>
              {countdownText(target.seconds)}
            </time>
            <small>London time</small>
          </div>
        </section>
      ) : state?.phase === 'jamaat-now' ? (
        <div className="jic-card-status jic-card-notice" role="status">
          <strong>{state.notice.name} Jamaat time</strong>
          <span>Please silence your phone.</span>
        </div>
      ) : (
        <p className="jic-card-empty" role="status">
          {isLoadingPrayerTimes
            ? 'Loading prayer times…'
            : row
              ? 'Next prayer time is not yet published.'
              : 'No published timetable for today.'}
        </p>
      )}

      {row ? (
        <div
          className="jic-card-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Prayer times, 12-hour clock, AM/PM"
        >
          <table className="jic-card-table">
            <caption className="sr-only">
              {dateLabel(selected)}: prayer begins and Jamaat times, 12-hour clock, AM/PM
            </caption>
            <colgroup>
              <col className="jic-card-label-column" />
              {columns.map(({ key }) => (
                <col
                  key={key}
                  data-wash={key === current ? 'current' : key === nextColumn ? 'next' : undefined}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Prayer</span>
                </th>
                {columns.map((prayer) => (
                  <th
                    scope="col"
                    key={prayer.key}
                    data-current={current === prayer.key || undefined}
                    data-upcoming={
                      (nextColumn === prayer.key && current !== prayer.key) || undefined
                    }
                    aria-current={current === prayer.key ? 'time' : undefined}
                  >
                    {prayer.name}
                    {nextColumn === prayer.key && <span className="sr-only">, next up</span>}
                    {current === prayer.key && <span className="sr-only">, current prayer</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Begins</th>
                {columns.map((prayer) => (
                  <td
                    key={prayer.key}
                    data-current={current === prayer.key || undefined}
                    data-next={nextCell(prayer.key, 'start', prayer.begins) || undefined}
                  >
                    <PrayerClock value={prayer.begins} />
                    {nextCell(prayer.key, 'start', prayer.begins) && (
                      <span className="sr-only">, next up</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Jamaat</th>
                {columns.map((prayer) => (
                  <td
                    key={prayer.key}
                    data-current={current === prayer.key || undefined}
                    data-next={nextCell(prayer.key, 'jamaat', prayer.jamaat) || undefined}
                  >
                    {prayer.friday ? (
                      <span className="jic-friday-reference" aria-label="Two Jummah sessions below">
                        Jummah
                      </span>
                    ) : (
                      <PrayerClock value={prayer.jamaat} />
                    )}
                    {nextCell(prayer.key, 'jamaat', prayer.jamaat) && (
                      <span className="sr-only">, next up</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        !isToday && (
          <p className="jic-card-empty" role="status">
            No published times for this day.
          </p>
        )
      )}
      {row && (
        <HomePrayerExtras compact={compact} date={selected} sunrise={row.sunrise} now={now} />
      )}
      {sessions.length > 0 && (
        <div className="jic-card-friday" role="group" aria-label="Friday Jummah times">
          <span>
            Jummah
            {isToday && jummahDate && jummahDate !== today ? (
              <small> · {dateLabel(jummahDate)}</small>
            ) : null}
          </span>
          {sessions.map((session) => (
            <span
              key={session.number}
              data-upcoming={target?.name === `Jummah ${session.number}` || undefined}
            >
              {session.number === 1 ? '1st' : '2nd'}{' '}
              <b>
                <PrayerClock value={session.prayer} />
              </b>
            </span>
          ))}
        </div>
      )}
      <nav className="jic-card-links" aria-label="Prayer links">
        <Link to="/prayer-times">
          Full timetable <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link to="/prayer-times/monthly#phone-wallpaper">
          Download wallpaper <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link to="/prayer-times/reminders">
          <Bell size={14} aria-hidden="true" /> Salah alerts
        </Link>
      </nav>
    </aside>
  );
}
