import React, { useEffect, useRef, useState } from 'react';
import PrayerTimesHeroSection from '@/components/sections/prayer-times/PrayerTimesHeroSection';
import TodaysPrayerTimesSection from '@/components/sections/prayer-times/TodaysPrayerTimesSection';
import PrayerScheduleTabs from '@/components/sections/prayer-times/PrayerScheduleTabs';
import PrayerGuidelinesSection from '@/components/sections/prayer-times/PrayerGuidelinesSection';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { Skeleton } from '@/components/ui/skeleton';

const PrayerTimesPage = ({ initialTab = 'daily' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const todayRef = useRef(null);
  const scheduleRef = useRef(null);
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

  const scrollToSection = (element, behavior = 'smooth') => {
    if (!element) return;
    // Keep the selected section visible below JIC's fixed prayer/navigation header.
    const header = document.querySelector('.jic-header');
    const offset = (header?.getBoundingClientRect().height || 190) + 14;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior });
  };

  useEffect(() => {
    setActiveTab(initialTab);
    if (isLoadingPrayerTimes) return;
    const timer = window.setTimeout(() => {
      scrollToSection(initialTab === 'today' ? todayRef.current : scheduleRef.current);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [initialTab, isLoadingPrayerTimes]);

  const handleScheduleTabChange = (tab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => scrollToSection(scheduleRef.current));
  };

  if (isLoadingPrayerTimes) {
    return (
      <div className="page-transition pt-24 container mx-auto px-4">
        <Skeleton className="h-48 w-full mb-8" />
        <Skeleton className="h-64 w-full mb-8" />
        <div className="flex justify-center mb-8"><Skeleton className="h-10 w-1/3" /></div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="page-transition pt-24">
      <PrayerTimesHeroSection formattedDate={formattedDate} formattedTime={formattedTime} />
      <div ref={todayRef} id="today-prayers">
        <TodaysPrayerTimesSection currentDate={currentDate} todaysTimes={todaysTimes} />
      </div>
      <div ref={scheduleRef} id="prayer-schedule">
        <PrayerScheduleTabs
          monthlyPrayerTimes={monthlyPrayerTimes}
          currentMonth={currentMonth}
          currentDate={currentDate}
          jummahTimes={jummahTimes}
          ramadanTimes={ramadanTimes}
          activeTab={activeTab === 'today' ? 'daily' : activeTab}
          setActiveTab={handleScheduleTabChange}
        />
      </div>
      <PrayerGuidelinesSection />
    </div>
  );
};

export default PrayerTimesPage;
