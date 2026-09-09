import React, { useState } from 'react';
    import PrayerTimesHeroSection from '@/components/sections/prayer-times/PrayerTimesHeroSection';
    import TodaysPrayerTimesSection from '@/components/sections/prayer-times/TodaysPrayerTimesSection';
    import PrayerScheduleTabs from '@/components/sections/prayer-times/PrayerScheduleTabs';
    import PrayerGuidelinesSection from '@/components/sections/prayer-times/PrayerGuidelinesSection';
    import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
    import { Skeleton } from "@/components/ui/skeleton";

    const PrayerTimesPage = () => {
      const [activeTab, setActiveTab] = useState('daily');
      const {
        currentDate,
        formattedDate,
        formattedTime,
        currentMonth,
        monthlyPrayerTimes,
        todaysTimes,
        jummahTimes,
        ramadanTimes,
        isLoadingPrayerTimes,
      } = usePrayerTimes();

      if (isLoadingPrayerTimes) {
        return (
          <div className="page-transition pt-24 container mx-auto px-4">
            <Skeleton className="h-48 w-full mb-8" />
            <Skeleton className="h-64 w-full mb-8" />
            <div className="flex justify-center mb-8">
              <Skeleton className="h-10 w-1/3" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        );
      }

      return (
        <div className="page-transition pt-24">
          <PrayerTimesHeroSection formattedDate={formattedDate} formattedTime={formattedTime} />
          <TodaysPrayerTimesSection currentDate={currentDate} todaysTimes={todaysTimes} />
          <PrayerScheduleTabs 
            monthlyPrayerTimes={monthlyPrayerTimes}
            currentMonth={currentMonth}
            currentDate={currentDate}
            jummahTimes={jummahTimes}
            ramadanTimes={ramadanTimes}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <PrayerGuidelinesSection />
        </div>
      );
    };

    export default PrayerTimesPage;