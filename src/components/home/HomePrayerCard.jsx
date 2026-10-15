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
        <div className="jic-home-prayer-actions">
          <Link to="/prayer-times">
            Full timetable <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link to="/prayer-times/reminders">
            <Bell size={16} aria-hidden="true" /> Reminders
          </Link>
        </div>
      </div>
      <Link to="/radio" className="jic-home-radio">
        <Radio size={20} aria-hidden="true" />
        <span>
          <strong>JIC Radio</strong>
          <small>Listen to the masjid</small>
        </span>
        <span className="jic-home-radio-action">
          Listen <ArrowRight size={15} aria-hidden="true" />
        </span>
      </Link>
    </aside>
  );
}
