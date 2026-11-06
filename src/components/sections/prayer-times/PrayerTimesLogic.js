import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { londonDate } from '@/lib/timetable';
import { prayerPublication } from '@/lib/prayerPublication';
import { prayerQueryRange } from '@/lib/prayerSnapshot';
import { loadPrayerSnapshot } from '@/lib/prayerSnapshot';
export const usePrayerTimes = ({ includeTomorrow = false } = {}) => {
  const [currentDate, setCurrentDate] = useState(new Date()),
    [monthlyPrayerTimes, setMonth] = useState([]),
    [todaysTimes, setToday] = useState(null),
    [tomorrowsTimes, setTomorrow] = useState(null),
    [jummahTimes, setJummah] = useState([]),
    [weeklyJummahTimes, setWeeklyJummah] = useState([]),
    [jummahDate, setJummahDate] = useState(null),
    [isLoading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    let inFlight = false;
    const controller = new AbortController();
    const load = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      try {
        const today = londonDate();
        const snapshot = await loadPrayerSnapshot(
          supabase,
          today,
          includeTomorrow,
          controller.signal,
        );
        if (!alive) return;
        const { daily, monthly, settings, fridayRow } = snapshot;
        const failed = daily.error || monthly.error || settings.error || fridayRow.error;
        setError(failed ? 'Timetable could not be loaded. Please contact the centre.' : '');
        const publication = prayerPublication(snapshot, today);
        setToday(publication.todaysTimes);
        setTomorrow(publication.tomorrowsTimes);
        setMonth(publication.monthlyPrayerTimes);
        setJummah(publication.jummahTimes);
        setWeeklyJummah(publication.weeklyJummahTimes);
        setJummahDate(prayerQueryRange(today).friday);
        setCurrentDate(new Date());
      } catch {
        if (alive) {
          setError('Timetable could not be loaded. Please contact the centre.');
          setToday(null);
          setTomorrow(null);
          setMonth([]);
          setJummah([]);
          setWeeklyJummah([]);
        }
      } finally {
        inFlight = false;
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 60000);
    const visible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', load);
    window.addEventListener('jic-content-updated', load);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', load);
      window.removeEventListener('jic-content-updated', load);
    };
  }, [includeTomorrow]);
  const options = { timeZone: 'Europe/London' };
  return {
    currentDate,
    formattedDate: currentDate.toLocaleDateString('en-GB', {
      ...options,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    formattedTime: currentDate.toLocaleTimeString('en-GB', {
      ...options,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    currentMonth: currentDate.toLocaleDateString('en-GB', { ...options, month: 'long' }),
    monthlyPrayerTimes,
    todaysTimes,
    tomorrowsTimes,
    jummahTimes,
    weeklyJummahTimes,
    jummahDate,
    ramadanTimes: monthlyPrayerTimes
      .filter((d) => d.is_ramadan)
      .map((d) => ({
        day: d.day,
        date: d.d_date,
        suhoor: d.fajr_begins,
        iftar: d.maghrib_begins,
        taraweeh: null,
      })),
    isLoadingPrayerTimes: isLoading,
    error,
  };
};
