import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { displayTime, londonDate } from '@/lib/timetable';

const prayers = [
  ['Fajr', 'fajr_begins', 'fajr_jamah'],
  ['Dhuhr', 'zuhr_begins', 'zuhr_jamah'],
  ['Asr', 'asr_begins', 'asr_jamah'],
  ['Maghrib', 'maghrib_begins', 'maghrib_jamah'],
  ['Isha', 'isha_begins', 'isha_jamah'],
];
const dateLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
const islamicLabel = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(iso + 'T12:00:00Z')) + ' AH';
  } catch { return ''; }
};

export default function HomePrayerCard() {
  const { monthlyPrayerTimes, todaysTimes, jummahTimes, isLoadingPrayerTimes } = usePublicPrayerTimes();
  const today = londonDate();
  const [selected, setSelected] = useState(today);
  const scroller = useRef(null);
  const days = monthlyPrayerTimes || [];
  const selectedIndex = days.findIndex((d) => d.isoDate === selected);
  const row = days[selectedIndex];
  const fallback = selected === today ? {
    fajr_begins: todaysTimes?.fajr, fajr_jamah: todaysTimes?.jamaah_fajr,
    zuhr_begins: todaysTimes?.dhuhr, zuhr_jamah: todaysTimes?.jamaah_dhuhr,
    asr_begins: todaysTimes?.asr, asr_jamah: todaysTimes?.jamaah_asr,
    maghrib_begins: todaysTimes?.maghrib, maghrib_jamah: todaysTimes?.jamaah_maghrib,
    isha_begins: todaysTimes?.isha, isha_jamah: todaysTimes?.jamaah_isha,
  } : null;
  const times = row || fallback;
  const move = (direction) => {
    const next = days[selectedIndex + direction];
    if (next) setSelected(next.isoDate);
  };
  useEffect(() => {
    setSelected(today);
  }, [today]);
  useEffect(() => {
    const active = scroller.current?.querySelector('[aria-current="date"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [selected, days.length]);
  return (
    <aside className="jic-home-prayer jic-prayer-browser" aria-label="Daily prayer timetable">
      <div className="jic-prayer-browser-heading">
        <div>
          <strong>{selected === today ? 'Today' : 'Prayer times'}</strong>
          <span>{dateLabel(selected)}</span>
          <small>{islamicLabel(selected)}</small>
        </div>
        {selected !== today && (
          <button type="button" className="jic-prayer-today-button" onClick={() => setSelected(today)}>Today</button>
        )}
      </div>
      <div className="jic-prayer-browser-controls">
        <button type="button" aria-label="Previous day" onClick={() => move(-1)} disabled={selectedIndex <= 0}><ChevronLeft size={19}/></button>
        <div className="jic-prayer-day-strip" ref={scroller} aria-label="Select timetable day">
          {days.map((day) => (
            <button key={day.isoDate} type="button" aria-current={selected === day.isoDate ? 'date' : undefined}
              onClick={() => setSelected(day.isoDate)}>
              {day.isoDate === today ? 'Today' : dateLabel(day.isoDate).replace(/ \d{4}$/, '')}
            </button>
          ))}
          {!days.length && <span>{dateLabel(today)}</span>}
        </div>
        <button type="button" aria-label="Next day" onClick={() => move(1)} disabled={selectedIndex < 0 || selectedIndex >= days.length - 1}><ChevronRight size={19}/></button>
      </div>
      {times ? (
        <div className="jic-prayer-browser-grid">
          {prayers.map(([name, startKey, jamKey]) => (
            <div className="jic-prayer-browser-item" key={name}>
              <strong>{name}</strong>
              <small>Start {displayTime(times[startKey])}</small>
              <span>Jama’ah</span>
              <b>{displayTime(times[jamKey])}</b>
            </div>
          ))}
        </div>
      ) : <p className="jic-prayer-browser-empty" role="status">{isLoadingPrayerTimes ? 'Loading timetable…' : 'No published times for this day.'}</p>}
      <div className="jic-prayer-browser-jummah">
        <span>Jummah 1 <strong>{displayTime(jummahTimes?.[0]?.prayer)}</strong></span>
        <span>Jummah 2 <strong>{displayTime(jummahTimes?.[1]?.prayer)}</strong></span>
      </div>
      <nav className="jic-home-prayer-footer" aria-label="Prayer links">
        <Link to="/prayer-times">Timetable <ArrowRight size={14} aria-hidden="true"/></Link>
        <Link to="/prayer-times/reminders"><Bell size={14} aria-hidden="true"/> Salah alerts</Link>
        <Link to="/radio"><Radio size={14} aria-hidden="true"/> JIC Radio</Link>
      </nav>
    </aside>
  );
}
