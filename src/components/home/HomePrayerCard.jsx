import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Radio, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { useContent } from '@/context/ContentContext';
import useLondonClock from '@/hooks/useLondonClock';
import useInstalledApp from '@/hooks/useInstalledApp';
import { displayTime } from '@/lib/timetable';
import { DAILY_PRAYERS, prayerStatus, timetableHijriLabel } from '@/lib/prayerStatus';
import '@/styles/compact-home.css';
const dateLabel = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
const dailyRow = (value) => value ? {
  fajr_begins: value.fajr, fajr_jamah: value.jamaah_fajr, sunrise: value.sunrise,
  zuhr_begins: value.dhuhr, zuhr_jamah: value.jamaah_dhuhr,
  asr_begins: value.asr, asr_jamah: value.jamaah_asr,
  maghrib_begins: value.maghrib, maghrib_jamah: value.jamaah_maghrib,
  isha_begins: value.isha, isha_jamah: value.jamaah_isha,
} : null;
function parseCalendar(raw) {
  try { return JSON.parse(raw || 'null'); } catch { return null; }
}
export default function HomePrayerCard() {
  const { monthlyPrayerTimes, todaysTimes, tomorrowsTimes, jummahTimes, isLoadingPrayerTimes, error } = usePublicPrayerTimes();
  const { getContent } = useContent();
  const { date: today, minutes } = useLondonClock();
  const installed = useInstalledApp();
  const [selected, setSelected] = useState(today);
  const [browsing, setBrowsing] = useState(false);
  const scroller = useRef(null);
  const days = monthlyPrayerTimes || [];
  const index = days.findIndex((day) => day.isoDate === selected);
  const times = days[index] || (selected === today && todaysTimes?.d_date === today ? dailyRow(todaysTimes) : null);
  const adjacentDate = (offset) => { const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
  const tomorrowDate = adjacentDate(1);
  const current = selected === today ? prayerStatus(times, minutes, {
    previous: days.find((day) => day.isoDate === adjacentDate(-1)),
    tomorrow: days.find((day) => day.isoDate === tomorrowDate) || (tomorrowsTimes?.d_date === tomorrowDate ? dailyRow(tomorrowsTimes) : null),
    friday: new Date(`${today}T12:00:00Z`).getUTCDay() === 5,
    jummah: [times?.jummah_1_jamah || (!error && jummahTimes?.[0]?.prayer), times?.jummah_2_jamah || (!error && jummahTimes?.[1]?.prayer)],
  }) : { current: null, nextJamaah: null };
  const hijri = timetableHijriLabel(parseCalendar(getContent(`prayer_calendar:${selected.slice(0, 7)}`, null)), selected);
  const move = (direction) => { const next = days[index + direction]; if (next) setSelected(next.isoDate); };
  useEffect(() => { setSelected(today); }, [today]);
  useEffect(() => {
    if (!browsing) return;
    scroller.current?.querySelector('[aria-current="date"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [browsing, selected, days.length]);
  return <aside className="jic-home-prayer jic-prayer-browser jic-compact-prayer" aria-label="Daily prayer timetable">
    <div className="jic-prayer-browser-heading"><div><strong>{selected === today ? 'Today' : 'Prayer times'}</strong><span>{dateLabel(selected)}</span>{hijri && <small title="Islamic dates follow the published JIC timetable and are subject to moon sighting.">{hijri}</small>}</div><div className="jic-compact-date-actions">{selected !== today && <button type="button" onClick={() => { setSelected(today); setBrowsing(false); }}>Today</button>}<button type="button" aria-label="Browse timetable dates" aria-expanded={browsing} aria-controls="home-prayer-dates" onClick={() => setBrowsing((value) => !value)}><CalendarDays size={18} aria-hidden="true" /> Dates</button></div></div>
    {selected === today && times && <div className="jic-prayer-now" role="status" aria-live="off"><strong>{current.current ? `${current.current} time` : 'Today’s Salah'}</strong>{current.nextJamaah && <span>Next Jama’ah: {current.nextJamaah.name} · {displayTime(current.nextJamaah.time)}{current.nextJamaah.tomorrow ? ' tomorrow' : ''}</span>}</div>}
    <div id="home-prayer-dates" hidden={!browsing}>{browsing && <div className="jic-prayer-browser-controls"><button type="button" aria-label="Previous day" onClick={() => move(-1)} disabled={index <= 0}><ChevronLeft size={19} /></button><div className="jic-prayer-day-strip" ref={scroller} aria-label="Select timetable day">{days.map((day) => <button key={day.isoDate} type="button" aria-current={selected === day.isoDate ? 'date' : undefined} onClick={() => setSelected(day.isoDate)}>{day.isoDate === today ? 'Today' : dateLabel(day.isoDate).replace(/ \d{4}$/, '')}</button>)}{!days.length && <span>{dateLabel(today)}</span>}</div><button type="button" aria-label="Next day" onClick={() => move(1)} disabled={index < 0 || index >= days.length - 1}><ChevronRight size={19} /></button></div>}</div>
    {times ? <div className="jic-prayer-browser-grid">{DAILY_PRAYERS.map(([name, startKey, jamKey]) => <div className={`jic-prayer-browser-item ${current.current === name ? 'is-current-prayer' : ''}`} key={name} aria-current={current.current === name ? 'time' : undefined}><strong>{name}</strong><small><span className="jic-prayer-start-label">Start </span>{displayTime(times[startKey])}</small><span>Jama’ah</span><b>{displayTime(times[jamKey])}</b>{current.current === name && <em>Current</em>}</div>)}</div> : <p className="jic-prayer-browser-empty" role="status">{isLoadingPrayerTimes ? 'Loading timetable…' : error || 'No published times for this day.'}</p>}
    <div className="jic-prayer-browser-jummah"><span>Jummah 1 <strong>{displayTime(jummahTimes?.[0]?.prayer)}</strong></span><span>Jummah 2 <strong>{displayTime(jummahTimes?.[1]?.prayer)}</strong></span></div>
    <nav className="jic-home-prayer-footer" aria-label="Prayer links"><Link to="/prayer-times">Timetable <ArrowRight size={14} aria-hidden="true" /></Link><Link to="/prayer-times/reminders"><Bell size={14} aria-hidden="true" /> Salah alerts</Link>{!installed && <Link to="/radio"><Radio size={14} aria-hidden="true" /> JIC Radio</Link>}</nav>
    {installed && <nav className="jic-app-primary-links" aria-label="JIC shortcuts"><Link to="/services">Community Hub <ArrowRight size={16} aria-hidden="true" /></Link><Link to="/education/courses">Classes</Link><Link to="/donate">Donate</Link></nav>}
  </aside>;
}
