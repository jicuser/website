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
    currentMonth,
    monthlyPrayerTimes,
    todaysTimes,
    jummahTimes,
    isLoadingPrayerTimes,
  } = usePrayerTimes();

  if (isLoadingPrayerTimes) {
    return <div className="page-transition pt-24 container mx-auto px-4">
      <Skeleton className="h-24 w-full mb-6" />
      <Skeleton className="h-72 w-full" />
    </div>;
  }

  const view = initialTab === 'daily'
    ? { title: 'Monthly Timetable', meta: currentMonth }
    : initialTab === 'jummah'
      ? { title: 'Jummah Times', meta: `Friday prayer · ${formattedDate}` }
      : { title: "Today's Prayer Times", meta: formattedDate };

  return <div className="page-transition pt-24">
    <PrayerTimesHeroSection title={view.title} meta={view.meta} />

    {initialTab === 'today' && <>
      <TodaysPrayerTimesSection currentDate={currentDate} todaysTimes={todaysTimes} />
      <PrayerGuidelinesSection />
    </>}

    {initialTab === 'daily' && <section className="py-4 sm:py-6 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 max-w-6xl">
        <MonthlyPrayerTable monthlyPrayerTimes={monthlyPrayerTimes} currentMonth={currentMonth} currentDate={currentDate} />
      </div>
    </section>}

    {initialTab === 'jummah' && <section className="py-4 sm:py-6 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 max-w-4xl">
        <JummahTimesCard jummahTimes={jummahTimes} />
      </div>
    </section>}
  </div>;
};

export default PrayerTimesPage;
