import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Radio } from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { nextCongregation } from '@/lib/nextCongregation';
import { displayTime } from '@/lib/timetable';

export default function HomePrayerCard() {
  const {
    todaysTimes,
    jummahTimes,
    currentDate,
    isLoadingPrayerTimes: isLoading,
    error,
  } = usePublicPrayerTimes();
  const next = nextCongregation(todaysTimes, jummahTimes, currentDate);
  return (
    <aside className="jic-home-prayer" aria-label="Prayer and radio">
      <div className="jic-home-prayer-main">
        <p className="jic-home-eyebrow">{next ? 'Next jama’ah' : 'Prayer times'}</p>
        {next ? (
          <>
            <div className="jic-home-prayer-time">
              <h2>{next.name}</h2>
              <strong>{displayTime(next.time)}</strong>
            </div>
            <p className="jic-home-prayer-note">
              {next.beginsLabel} {displayTime(next.begins)}
            </p>
          </>
        ) : (
          <p className="jic-home-prayer-note" role="status">
            {isLoading
              ? 'Loading today’s times…'
              : error
                ? 'Times are unavailable. Please check with the centre.'
                : todaysTimes
                  ? 'View the full timetable for prayer and Jummah times.'
                  : 'Today’s times have not been published yet.'}
          </p>
        )}
      </div>
      <div className="jic-home-jummah" role="group" aria-label="Friday Jummah times">
        {[0, 1].map((index) => (
          <Link
            key={index}
            to="/prayer-times/jummah"
            aria-label={`Jummah ${index + 1} jama’ah ${displayTime(jummahTimes[index]?.prayer)}. View Friday timetable`}
          >
            <span>Jummah {index + 1}</span>
            <strong>{displayTime(jummahTimes[index]?.prayer)}</strong>
          </Link>
        ))}
      </div>
      <nav className="jic-home-prayer-footer" aria-label="Prayer links">
        <Link to="/prayer-times" aria-label="Full timetable">
          Timetable <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link to="/prayer-times/reminders" aria-label="Set up Salah alerts">
          <Bell size={14} aria-hidden="true" /> Salah alerts
        </Link>
        <Link to="/radio" aria-label="Listen to JIC Radio">
          <Radio size={14} aria-hidden="true" /> JIC Radio
        </Link>
      </nav>
    </aside>
  );
}
