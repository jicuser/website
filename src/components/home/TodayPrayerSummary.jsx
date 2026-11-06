import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { nextCongregation } from '@/lib/nextCongregation';
import PrayerClock from '@/components/PrayerClock';
import JummahJamaat from '@/components/JummahJamaat';

// The home card and inner-page dock share the same published times and labels.
export default function TodayPrayerSummary({ showLink = true }) {
  const { todaysTimes, jummahTimes, currentDate, isLoadingPrayerTimes } = usePublicPrayerTimes();
  const next = nextCongregation(todaysTimes, jummahTimes, currentDate);
  const isFriday =
    currentDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' }) ===
    'Fri';
  const prayers = [
    { name: 'Fajr', start: todaysTimes?.fajr, time: todaysTimes?.jamaah_fajr },
    { name: 'Dhuhr', start: todaysTimes?.dhuhr, time: todaysTimes?.jamaah_dhuhr, friday: isFriday },
    { name: 'Asr', start: todaysTimes?.asr, time: todaysTimes?.jamaah_asr },
    { name: 'Maghrib', start: todaysTimes?.maghrib, time: todaysTimes?.jamaah_maghrib },
    { name: 'Isha', start: todaysTimes?.isha, time: todaysTimes?.jamaah_isha },
  ];
  const isNext = ({ name, friday }) =>
    next?.name === name || (friday && next?.name.startsWith('Jummah'));

  return (
    <div className="jic-mobile-prayer-content">
      <div className="jic-mobile-prayer-rows">
        <div className="jic-mobile-prayer-heading">
          <span>Today’s prayer times</span>
          {showLink && (
            <Link to="/prayer-times" className="jic-mobile-prayer-link">
              Full timetable <ChevronRight size={13} aria-hidden="true" />
            </Link>
          )}
        </div>
        {todaysTimes ? (
          <table className="jic-mobile-prayer-table">
            <caption className="sr-only">Today’s prayer start and Jamaat times, AM/PM</caption>
            <colgroup>
              <col className="jic-mini-label-column" />
              {prayers.map((prayer) => (
                <col key={prayer.name} data-friday={prayer.friday || undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Prayer</span>
                </th>
                {prayers.map((prayer) => (
                  <th key={prayer.name} scope="col" data-next={isNext(prayer) || undefined}>
                    {prayer.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Start</th>
                {prayers.map((prayer) => (
                  <td key={prayer.name}>
                    <PrayerClock value={prayer.start} />
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Jamaat</th>
                {prayers.map((prayer) => (
                  <td key={prayer.name} data-next={isNext(prayer) || undefined}>
                    {prayer.friday ? (
                      <JummahJamaat sessions={jummahTimes} upcomingName={next?.name} showHeading />
                    ) : (
                      <PrayerClock value={prayer.time} />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        ) : (
          <span className="jic-mobile-prayer-empty" role="status">
            {isLoadingPrayerTimes ? 'Loading today’s times…' : 'Today’s timetable is unavailable'}
          </span>
        )}
      </div>
    </div>
  );
}
