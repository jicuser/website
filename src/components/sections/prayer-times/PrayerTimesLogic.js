import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { londonDate, displayTime, defaultJummah } from '@/lib/timetable';
import { loadPrayerSnapshot } from '@/lib/prayerSnapshot';
const formatTime = displayTime;
const formatMonthRecord = (pt) => {
  const dateObj = new Date(pt.d_date + 'T00:00:00');
  return {
    isoDate: pt.d_date,
    d_date: dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    day: dateObj.getDate(),
    dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
    fajr_begins: formatTime(pt.fajr_begins),
    fajr_jamah: formatTime(pt.fajr_jamah),
    sunrise: formatTime(pt.sunrise),
    zuhr_begins: formatTime(pt.zuhr_begins),
    zuhr_jamah: formatTime(pt.zuhr_jamah),
    asr_begins: formatTime(pt.asr_begins),
    asr_jamah: formatTime(pt.asr_jamah),
    maghrib_begins: formatTime(pt.maghrib_begins),
    maghrib_jamah: formatTime(pt.maghrib_jamah),
    isha_begins: formatTime(pt.isha_begins),
    isha_jamah: formatTime(pt.isha_jamah),
    is_ramadan: pt.is_ramadan,
  };
};

export const usePrayerTimes = ({ includeTomorrow = false } = {}) => {
  const [currentDate, setCurrentDate] = useState(new Date()),
    [monthlyPrayerTimes, setMonth] = useState([]),
    [todaysTimes, setToday] = useState(null),
    [tomorrowsTimes, setTomorrow] = useState(null),
    [jummahTimes, setJummah] = useState([]),
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
        const { daily, monthly, settings, fridayRow, nextDay } = await loadPrayerSnapshot(
          supabase,
          londonDate(),
          includeTomorrow,
          controller.signal,
        );
        if (!alive) return;
        const failed = daily.error || monthly.error || settings.error || fridayRow.error;
        setError(failed ? 'Timetable could not be loaded. Please contact the centre.' : '');
        const d = daily.error ? null : daily.data;
        setToday(
          d
            ? {
                d_date: d.d_date,
                fajr: formatTime(d.fajr_begins),
                sunrise: formatTime(d.sunrise),
                dhuhr: formatTime(d.zuhr_begins),
                asr: formatTime(d.asr_begins),
                maghrib: formatTime(d.maghrib_begins),
                isha: formatTime(d.isha_begins),
                jamaah_fajr: formatTime(d.fajr_jamah),
                jamaah_dhuhr: formatTime(d.zuhr_jamah),
                jamaah_asr: formatTime(d.asr_jamah),
                jamaah_maghrib: formatTime(d.maghrib_jamah),
                jamaah_isha: formatTime(d.isha_jamah),
                is_ramadan: d.is_ramadan,
              }
            : null,
        );
        setTomorrow(
          nextDay.data && !nextDay.error
            ? {
                d_date: nextDay.data.d_date,
                fajr: formatTime(nextDay.data.fajr_begins),
                maghrib: formatTime(nextDay.data.maghrib_begins),
              }
            : null,
        );
        setMonth(monthly.error ? [] : (monthly.data || []).map(formatMonthRecord));
        const j = {
          ...defaultJummah,
          ...(settings.data ? JSON.parse(settings.data.content_value) : {}),
        };
        for (const key of Object.keys(defaultJummah))
          if (fridayRow.data?.[key]) j[key] = fridayRow.data[key];
        setJummah([
          {
            name: 'First Jummah',
            khutbah: formatTime(j.jummah_1_start),
            prayer: formatTime(j.jummah_1_jamah),
          },
          {
            name: 'Second Jummah',
            khutbah: formatTime(j.jummah_2_begins),
            prayer: formatTime(j.jummah_2_jamah),
          },
        ]);
        setCurrentDate(new Date());
      } catch {
        if (alive) {
          setError('Timetable could not be loaded. Please contact the centre.');
          setToday(null);
          setTomorrow(null);
          setMonth([]);
        }
      } finally {
        inFlight = false;
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener('focus', load);
    window.addEventListener('jic-content-updated', load);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
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
