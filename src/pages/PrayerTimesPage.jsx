import React, { useEffect, useState } from 'react';
import { Bell, Download } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import useDisplayClock from '@/hooks/useDisplayClock';
import { londonDay } from '@/lib/prayerDisplayState';
import { compactTime, selectedPrayerRow } from '@/lib/homePrayerView';
import { displayTime } from '@/lib/timetable';
import {
  publishedSalahDates,
  selectedSalahDate,
  salahDateLabel,
  salahIslamicDate,
} from '@/lib/salahWorkspace';
import SalahDailyCard from '@/components/sections/prayer-times/SalahDailyCard';
import SalahMonthCalendar from '@/components/sections/prayer-times/SalahMonthCalendar';
import MonthlyPrayerTable from '@/components/sections/prayer-times/MonthlyPrayerTable';
import PrayerGuidelinesSection from '@/components/sections/prayer-times/PrayerGuidelinesSection';
import { Skeleton } from '@/components/ui/skeleton';
import '@/styles/salah-workspace.css';

function JummahStrip({ sessions = [] }) {
  return (
    <section className="salah-jummah" id="jummah-times" aria-label="Jummah prayer times">
      <h2>Jummah</h2>
      <dl>
        {sessions.map((session, index) => (
          <div key={session.name || index}>
            <dt>{index === 0 ? '1st' : index === 1 ? '2nd' : `${index + 1}th`} Jamaat</dt>
            <dd>{displayTime(session.prayer)}</dd>
          </div>
        ))}
      </dl>
      {!sessions.length && <p>Jummah times have not been published.</p>}
      <details>
        <summary>Khutbah &amp; visiting</summary>
        {sessions
          .filter((session) => compactTime(session.khutbah) !== '—')
          .map((session, index) => (
            <p key={session.name || index}>
              {session.name || `Jummah ${index + 1}`} khutbah{' '}
              <strong>{displayTime(session.khutbah)}</strong>
            </p>
          ))}
        <p>Please arrive early for the khutbah and silence your phone.</p>
        <Link to="/contact">Plan your visit</Link>
      </details>
    </section>
  );
}

export default function PrayerTimesPage({ initialTab = 'today' }) {
  const { hash, search } = useLocation();
  const {
    monthlyPrayerTimes = [],
    todaysTimes,
    tomorrowsTimes,
    jummahTimes = [],
    isLoadingPrayerTimes,
  } = usePublicPrayerTimes();
  const now = useDisplayClock();
  const today = londonDay(now);
  const islamicDate = salahIslamicDate(today);
  const dates = publishedSalahDates(monthlyPrayerTimes);
  const datesKey = dates.join(',');
  const [chosenDate, setChosenDate] = useState(today);
  const [fullOpen, setFullOpen] = useState(hash === '#phone-wallpaper');
  const selected = selectedSalahDate(dates, chosenDate, today);
  const monthView = initialTab === 'daily';
  const row = selectedPrayerRow(
    monthlyPrayerTimes,
    todaysTimes,
    monthView ? selected : today,
    today,
  );
  const month = selected.slice(0, 7);
  const monthlyRows = monthlyPrayerTimes.filter((day) => day.isoDate?.startsWith(`${month}-`));
  const currentMonth = salahDateLabel(`${month}-01`, true).replace(/\s+\d{4}$/, '');
  const monthDate = new Date(`${month}-01T12:00:00Z`);

  useEffect(() => {
    setChosenDate((value) => selectedSalahDate(datesKey ? datesKey.split(',') : [], value, today));
  }, [datesKey, today]);
  useEffect(() => {
    if (hash === '#phone-wallpaper') setFullOpen(true);
  }, [hash]);
  useEffect(() => {
    if (isLoadingPrayerTimes || !hash || (hash === '#phone-wallpaper' && (!monthView || !fullOpen)))
      return undefined;
    const frame = window.requestAnimationFrame(() =>
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [hash, monthView, fullOpen, isLoadingPrayerTimes]);

  // Keep previously shared addresses pointed at the real downloads and inline Friday times.
  if (hash === '#phone-wallpaper' && !monthView)
    return <Navigate to={`/prayer-times/monthly${search}#phone-wallpaper`} replace />;
  if (initialTab === 'jummah')
    return <Navigate to={`/prayer-times${search}#jummah-times`} replace />;

  return (
    <section className="salah-workspace page-transition" aria-labelledby="salah-title">
      <header className="salah-heading jic-pattern-edge">
        <div>
          <h1 id="salah-title">Salah times</h1>
          <p>
            <time dateTime={today}>{salahDateLabel(today)}</time>
            {islamicDate && <> · {islamicDate}</>}
          </p>
        </div>
        <Link to="/prayer-times/reminders" className="salah-alert-link" aria-label="Salah alerts">
          <Bell size={21} aria-hidden="true" />
          <span>Salah alerts</span>
        </Link>
      </header>
      <nav className="salah-view-tabs" aria-label="Salah timetable views">
        <Link to={`/prayer-times${search}`} aria-current={!monthView ? 'page' : undefined}>
          Today
        </Link>
        <Link to={`/prayer-times/monthly${search}`} aria-current={monthView ? 'page' : undefined}>
          Month
        </Link>
      </nav>
      {isLoadingPrayerTimes ? (
        <div className="salah-loading" role="status">
          <span className="sr-only">Loading prayer times…</span>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : monthView ? (
        <>
          <div className="salah-month-layout">
            <SalahMonthCalendar
              dates={dates}
              selected={selected}
              today={today}
              onSelect={setChosenDate}
            />
            <div className="salah-selected-day">
              <h2>{salahDateLabel(selected)}</h2>
              <SalahDailyCard
                row={row}
                date={selected}
                now={now}
                tomorrow={tomorrowsTimes}
                jummahTimes={jummahTimes}
                summary={false}
              />
            </div>
          </div>
          <div className="salah-month-actions">
            <Link
              to={`/prayer-times/monthly${search}#phone-wallpaper`}
              onClick={() => setFullOpen(true)}
            >
              <Download size={17} aria-hidden="true" /> Download timetable
            </Link>
            <button
              type="button"
              aria-controls="salah-full-month"
              aria-expanded={fullOpen}
              onClick={() => setFullOpen(!fullOpen)}
            >
              {fullOpen ? 'Hide full month' : 'View full month'}
            </button>
          </div>
          <section
            id="salah-full-month"
            className="salah-full-month"
            aria-label="Full monthly timetable and downloads"
            hidden={!fullOpen}
          >
            {fullOpen && (
              <MonthlyPrayerTable
                monthlyPrayerTimes={monthlyRows}
                currentMonth={currentMonth}
                currentDate={monthDate}
                todayDate={today}
                jummahTimes={jummahTimes}
              />
            )}
          </section>
        </>
      ) : (
        <div className="salah-today-layout">
          <SalahDailyCard
            row={row}
            date={today}
            now={now}
            tomorrow={tomorrowsTimes}
            jummahTimes={jummahTimes}
          />
          <aside className="salah-support" aria-label="Friday times and timetable tools">
            <JummahStrip sessions={jummahTimes} />
            <Link
              className="salah-download-link"
              to={`/prayer-times/monthly${search}#phone-wallpaper`}
            >
              <Download size={19} aria-hidden="true" />
              <span>
                Download timetable<small>A4 timetable · Phone wallpaper</small>
              </span>
            </Link>
            <details className="salah-information">
              <summary>About these times</summary>
              <p>
                Prayer times use the centre’s published timetable and the UK clock. Starts and
                Jamaat are shown in the 24-hour clock.
              </p>
              <p>
                Ishraq is shown approximately 20 minutes after sunrise. Published Zawal times are
                shown separately.
              </p>
            </details>
          </aside>
        </div>
      )}
      <div className="salah-guidance">
        <PrayerGuidelinesSection />
      </div>
    </section>
  );
}
