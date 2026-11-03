import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { displayTime } from '@/lib/timetable';
import useDisplayClock from '@/hooks/useDisplayClock';
import { countdownText, londonDay, prayerDisplayState } from '@/lib/prayerDisplayState';
import { compactTime, prayerColumns, selectedPrayerRow } from '@/lib/homePrayerView';
import '@/styles/jic-prayer-modern.css';

const dateLabel = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
});
const islamicLabel = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`)).replace(/(?:\s*AH)+$/, '') + ' AH';
  } catch { return ''; }
};

export default function HomePrayerCard({ compact = false }) {
  const { monthlyPrayerTimes, todaysTimes, tomorrowsTimes, jummahTimes, isLoadingPrayerTimes } = usePublicPrayerTimes();
  const now = useDisplayClock();
  const today = londonDay(now);
  const [selected, setSelected] = useState(today);
  const days = monthlyPrayerTimes || [];
  const selectedIndex = days.findIndex((day) => day.isoDate === selected);
  const isToday = selected === today;
  const row = selectedPrayerRow(days, todaysTimes, selected, today);
  const state = isToday ? prayerDisplayState({ todaysTimes: row, tomorrowsTimes, jummahTimes }, now) : null;
  const target = state?.target;
  const columns = prayerColumns(row, selected, jummahTimes, isToday);
  const sessions = (isToday ? jummahTimes || [] : [
    { prayer: row?.jummah_1_jamah }, { prayer: row?.jummah_2_jamah },
  ]).map((session, index) => ({ ...session, number: index + 1 }))
    .filter((session) => compactTime(session.prayer) !== '—');
  useEffect(() => { setSelected(today); }, [today]);
  const move = (direction) => {
    const next = days[selectedIndex + direction];
    if (next) setSelected(next.isoDate);
  };
  const current = state?.current?.key;
  const DateTitle = compact ? 'h2' : 'strong';

  return (
    <aside className={`jic-home-prayer jic-prayer-card${compact ? ' is-compact' : ''}`} aria-label="Daily prayer timetable">
      <header className="jic-card-heading">
        <div className="jic-card-date">
          <DateTitle>
            {isToday ? (compact ? 'Today’s Salah' : 'Today') : 'Timetable'}{' '}
            {!compact && <span>· {dateLabel(selected)}</span>}
          </DateTitle>
          <small>
            {compact && <>{dateLabel(selected)} · </>}
            <span className="jic-card-islamic-date">{islamicLabel(selected)}</span>
          </small>
        </div>
        <div className="jic-card-date-controls" role="group" aria-label="Choose timetable day">
          <button type="button" aria-label="Previous day" onClick={() => move(-1)} disabled={selectedIndex <= 0}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <label className="jic-card-calendar">
            <CalendarDays size={18} aria-hidden="true" />
            <span className="sr-only">Choose timetable date</span>
            <input type="date" value={selected} min={days[0]?.isoDate || today}
              max={days.at(-1)?.isoDate || today} disabled={!days.length}
              onChange={(event) => { if (days.some((day) => day.isoDate === event.target.value)) setSelected(event.target.value); }} />
          </label>
          <button type="button" aria-label="Next day" onClick={() => move(1)} disabled={selectedIndex < 0 || selectedIndex >= days.length - 1}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {!isToday ? (
        <div className="jic-card-status jic-card-browsing">
          <span>Published timetable</span>
          <button type="button" onClick={() => setSelected(today)}>Back to today</button>
        </div>
      ) : compact && (state?.current || target) && state.phase !== 'jamaat-now' ? (
        <section className="jic-card-compact-status" aria-label="Current and next prayer, 24-hour clock">
          {state.current && <span className="jic-card-current">Current · {state.current.name}</span>}
          <div>
            {target ? (
              <>
                <p>
                  {target.kind === 'start' ? 'Next' : 'Next Jamaat'} ·{' '}
                  <strong>
                    {target.name}{target.tomorrow ? ' tomorrow' : ''}{' '}
                    <time>{compactTime(target.time)}</time>
                  </strong>
                </p>
                {target.kind === 'start' && target.congregationTime && (
                  <small>Jamaat {compactTime(target.congregationTime)}</small>
                )}
              </>
            ) : (
              <p>Next prayer time is not yet published.</p>
            )}
          </div>
        </section>
      ) : target ? (
        <section className="jic-card-status" aria-label="Next prayer">
          <div className="jic-card-next">
            <span className="jic-card-eyebrow">{target.tomorrow ? 'Tomorrow' : target.kind === 'start' ? 'Next prayer' : 'Next Jamaat'}</span>
            <strong>{target.name} <span>{displayTime(target.time)}</span></strong>
            <small>{target.kind === 'start' && target.congregationTime ? `Jamaat ${displayTime(target.congregationTime)}` : 'Congregation at the masjid'}</small>
          </div>
          <div className="jic-card-countdown">
            <span>{target.kind === 'start' ? 'Begins in' : 'Jamaat in'}</span>
            <time role="timer" aria-live="off" aria-label={`Time until ${target.label}`}>{countdownText(target.seconds)}</time>
            <small>{state.current ? `Current: ${state.current.name}` : 'London time'}</small>
          </div>
        </section>
      ) : state?.phase === 'jamaat-now' ? (
        <div className="jic-card-status jic-card-notice" role="status"><strong>{state.notice.name} Jamaat time</strong><span>Please silence your phone.</span></div>
      ) : (
        <p className="jic-card-empty" role="status">{isLoadingPrayerTimes ? 'Loading prayer times…' : row ? 'Next prayer time is not yet published.' : 'No published timetable for today.'}</p>
      )}

      {row ? (
        <div className="jic-card-table-scroll" tabIndex={0} role="region" aria-label="Prayer times, 24-hour clock">
          <table className="jic-card-table">
            <caption className="sr-only">{dateLabel(selected)}: prayer begins and Jamaat times, 24-hour clock</caption>
            <thead><tr><th scope="col"><span className="sr-only">Prayer</span><span aria-hidden="true">24h</span></th>
              {columns.map((prayer) => <th scope="col" key={prayer.key} data-current={current === prayer.key || undefined} aria-current={current === prayer.key ? 'time' : undefined}>
                {prayer.name}{current === prayer.key && <span className="sr-only">, current prayer</span>}
              </th>)}
            </tr></thead>
            <tbody>
              <tr><th scope="row">Begins</th>{columns.map((prayer) => <td key={prayer.key} data-current={current === prayer.key || undefined}>{compactTime(prayer.begins)}</td>)}</tr>
              <tr><th scope="row">Jamaat</th>{columns.map((prayer) => <td key={prayer.key} data-current={current === prayer.key || undefined}>{compactTime(prayer.jamaat)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      ) : !isToday && <p className="jic-card-empty" role="status">No published times for this day.</p>}
      {sessions.length > 0 && <div className="jic-card-friday"><span>Jummah</span>{sessions.map((session) => (
        <span key={session.number}>{session.number === 1 ? '1st' : '2nd'} <b>{displayTime(session.prayer)}</b></span>
      ))}</div>}
      <nav className="jic-card-links" aria-label="Prayer links">
        <Link to="/prayer-times">Full timetable <ArrowRight size={14} aria-hidden="true" /></Link>
        <Link to="/prayer-times/reminders"><Bell size={14} aria-hidden="true" /> Salah alerts</Link>
      </nav>
    </aside>
  );
}
