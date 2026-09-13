import React, { createContext, useContext } from 'react';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';

const PrayerTimesContext = createContext(null);

// Keep the public timetable loaded while visitors move between pages.
// TV and admin continue using their independent timetable lifecycles.
export function PublicPrayerTimesProvider({ children }) {
  const times = usePrayerTimes();
  return <PrayerTimesContext.Provider value={times}>{children}</PrayerTimesContext.Provider>;
}

export function usePublicPrayerTimes() {
  const times = useContext(PrayerTimesContext);
  if (!times) throw new Error('usePublicPrayerTimes requires PublicPrayerTimesProvider');
  return times;
}
