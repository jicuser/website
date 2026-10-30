import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PrayerTimesHeroSection from '@/components/sections/prayer-times/PrayerTimesHeroSection';
import TodaysPrayerTimesSection from '@/components/sections/prayer-times/TodaysPrayerTimesSection';
import {
  MonthlyPrayerTable,
  JummahTimesCard,
} from '@/components/sections/prayer-times/PrayerScheduleTabs';
import PrayerGuidelinesSection from '@/components/sections/prayer-times/PrayerGuidelinesSection';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { Skeleton } from '@/components/ui/skeleton';
import { prayerQueryRange } from '@/lib/prayerSnapshot';

export default function PrayerTimesPage({ initialTab = 'today' }) {
  const { hash, search } = useLocation();
  const {
    currentDate,
    formattedDate,
    currentMonth,
    monthlyPrayerTimes,
    todaysTimes,
    jummahTimes,
    jummahError,
    isLoadingPrayerTimes,
  } = usePublicPrayerTimes();

  // Preserve wallpaper links shared before the timetable was split into pages.
  if (initialTab !== 'daily' && hash === '#phone-wallpaper')
    return <Navigate to={`/prayer-times/monthly${search}#phone-wallpaper`} replace />;

  if (isLoadingPrayerTimes) {
    return (
      <div className="page-transition container mx-auto px-4 py-5">
        <Skeleton className="mb-4 h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const friday = prayerQueryRange(
    currentDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }),
  ).friday;
  const formattedFriday = new Date(`${friday}T12:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const view =
    initialTab === 'daily'
      ? { title: 'Monthly Timetable', meta: currentMonth }
      : initialTab === 'jummah'
        ? { title: 'Jummah Times', meta: `Friday prayer · ${formattedFriday}` }
        : { title: "Today's Prayer Times", meta: formattedDate };

  return (
    <div className="page-transition">
      <PrayerTimesHeroSection title={view.title} meta={view.meta} />

      {initialTab === 'today' && (
        <>
          <TodaysPrayerTimesSection currentDate={currentDate} todaysTimes={todaysTimes} />
          <PrayerGuidelinesSection />
        </>
      )}

      {initialTab === 'daily' && (
        <section className="bg-gray-50 py-4 dark:bg-gray-800 sm:py-6">
          <div className="container mx-auto max-w-6xl px-4">
            <MonthlyPrayerTable
              monthlyPrayerTimes={monthlyPrayerTimes}
              currentMonth={currentMonth}
              currentDate={currentDate}
              jummahTimes={jummahTimes}
            />
          </div>
        </section>
      )}

      {initialTab === 'jummah' && (
        <section className="bg-gray-50 py-4 dark:bg-gray-800 sm:py-6">
          <div className="container mx-auto max-w-4xl px-4">
            <JummahTimesCard jummahTimes={jummahTimes} error={jummahError} />
          </div>
        </section>
      )}
    </div>
  );
}
