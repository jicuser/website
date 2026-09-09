import React from 'react';
import PrayerTimesHeroSection from '@/components/sections/prayer-times/PrayerTimesHeroSection';
import TodaysPrayerTimesSection from '@/components/sections/prayer-times/TodaysPrayerTimesSection';
import { MonthlyPrayerTable, JummahTimesCard } from '@/components/sections/prayer-times/PrayerScheduleTabs';
import PrayerGuidelinesSection from '@/components/sections/prayer-times/PrayerGuidelinesSection';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { Skeleton } from '@/components/ui/skeleton';

const PrayerTimesPage = ({ initialTab = 'today' }) => {
  const {
    currentDate,
    formattedDate,
    formattedTime,
    currentMonth,
    monthlyPrayerTimes,
    todaysTimes,
    jummahTimes,
    isLoadingPrayerTimes,
  } = usePrayerTimes();

  if (isLoadingPrayerTimes) {
    return <div className="page-transition pt-24 container mx-auto px-4">
      <Skeleton className="h-48 w-full mb-8" />
      <Skeleton className="h-72 w-full" />
    </div>;
  }

  return <div className="page-transition pt-24">
    <PrayerTimesHeroSection formattedDate={formattedDate} formattedTime={formattedTime} />

    {initialTab === 'today' && <>
      <TodaysPrayerTimesSection currentDate={currentDate} todaysTimes={todaysTimes} />
      <PrayerGuidelinesSection />
    </>}

    {initialTab === 'daily' && <section className="py-10 sm:py-14 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-7 text-center"><h2 className="text-3xl font-bold">Monthly Timetable</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Start and Jama'ah times for the current month.</p></div>
        <MonthlyPrayerTable monthlyPrayerTimes={monthlyPrayerTimes} currentMonth={currentMonth} currentDate={currentDate} />
      </div>
    </section>}

    {initialTab === 'jummah' && <section className="py-10 sm:py-14 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-7 text-center"><h2 className="text-3xl font-bold">Jummah</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Friday khutbah and Jama'ah times.</p></div>
        <JummahTimesCard jummahTimes={jummahTimes} />
      </div>
    </section>}
  </div>;
};

export default PrayerTimesPage;
