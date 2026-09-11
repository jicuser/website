import React from 'react';
import PrayerTimesHeroSection from '@/components/sections/prayer-times/PrayerTimesHeroSection';
import TodaysPrayerTimesSection from '@/components/sections/prayer-times/TodaysPrayerTimesSection';
import {
  MonthlyPrayerTable,
  JummahTimesCard,
} from '@/components/sections/prayer-times/PrayerScheduleTabs';
import PrayerGuidelinesSection from '@/components/sections/prayer-times/PrayerGuidelinesSection';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrayerTimesPage({ initialTab = 'today' }) {
  const {
    currentDate,
    formattedDate,
    currentMonth,
    monthlyPrayerTimes,
    todaysTimes,
    jummahTimes,
    isLoadingPrayerTimes,
  } = usePrayerTimes();

  if (isLoadingPrayerTimes) {
    return (
      <div className="page-transition container mx-auto px-4 py-5">
        <Skeleton className="mb-4 h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const view =
    initialTab === 'daily'
      ? { title: 'Monthly Timetable', meta: currentMonth }
      : initialTab === 'jummah'
        ? { title: 'Jummah Times', meta: `Friday prayer · ${formattedDate}` }
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
            />
          </div>
        </section>
      )}

      {initialTab === 'jummah' && (
        <section className="bg-gray-50 py-4 dark:bg-gray-800 sm:py-6">
          <div className="container mx-auto max-w-4xl px-4">
            <JummahTimesCard jummahTimes={jummahTimes} />
          </div>
        </section>
      )}
    </div>
  );
}
