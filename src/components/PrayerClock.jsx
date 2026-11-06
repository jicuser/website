import React from 'react';
import { displayTime } from '@/lib/timetable';
import '@/styles/prayer-clock.css';

export default function PrayerClock({ value }) {
  const [clock, period] = displayTime(value).split(' ');
  return (
    <span className="prayer-clock">
      {clock}
      {period && (
        <>
          {' '}
          <small className="prayer-clock-period">{period}</small>
        </>
      )}
    </span>
  );
}
