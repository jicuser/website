import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import WallpaperDownload from '@/components/WallpaperDownload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

export const MonthlyPrayerTable = ({ monthlyPrayerTimes, currentMonth, currentDate }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden"
  >
    <div className="bg-primary text-white px-4 py-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
            Monthly schedule
          </p>
          <h3 className="text-lg sm:text-xl font-bold">{currentMonth} Prayer Times</h3>
        </div>
        {monthlyPrayerTimes.length > 0 && (
          <WallpaperDownload
            monthlyPrayerTimes={monthlyPrayerTimes}
            currentMonth={`${currentMonth} ${currentDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London', year: 'numeric' })}`}
          />
        )}
      </div>
    </div>
    {monthlyPrayerTimes.length === 0 && (
      <p className="p-6 text-center">
        This month’s timetable has not been uploaded yet. Please contact the centre.
      </p>
    )}
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-600">
            <th className="p-3 text-left text-xs sm:text-sm">Day</th>
            <th className="p-3 text-left text-xs sm:text-sm">Date</th>
            <th className="p-3 text-left text-xs sm:text-sm">Fajr Begins</th>
            <th className="p-3 text-left text-xs sm:text-sm">Fajr Jama'ah</th>
            <th className="p-3 text-left text-xs sm:text-sm">Sunrise</th>
            <th className="p-3 text-left text-xs sm:text-sm">Dhuhr Begins</th>
            <th className="p-3 text-left text-xs sm:text-sm">Dhuhr Jama'ah</th>
            <th className="p-3 text-left text-xs sm:text-sm">Asr Begins</th>
            <th className="p-3 text-left text-xs sm:text-sm">Asr Jama'ah</th>
            <th className="p-3 text-left text-xs sm:text-sm">Maghrib Begins</th>
            <th className="p-3 text-left text-xs sm:text-sm">Maghrib Jama'ah</th>
            <th className="p-3 text-left text-xs sm:text-sm">Isha Begins</th>
            <th className="p-3 text-left text-xs sm:text-sm">Isha Jama'ah</th>
          </tr>
        </thead>
        <tbody>
          {monthlyPrayerTimes.map((dayData, index) => (
            <tr
              key={index}
              className={`border-b border-gray-200 dark:border-gray-600 text-xs sm:text-sm ${dayData.day === currentDate.getDate() ? 'bg-primary/10' : index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
            >
              <td className="p-3 font-medium">{dayData.day}</td>
              <td className="p-3">{dayData.d_date}</td>
              <td className="p-3">{dayData.fajr_begins}</td>
              <td className="p-3">{dayData.fajr_jamah}</td>
              <td className="p-3">{dayData.sunrise}</td>
              <td className="p-3">{dayData.zuhr_begins}</td>
              <td className="p-3">{dayData.zuhr_jamah}</td>
              <td className="p-3">{dayData.asr_begins}</td>
              <td className="p-3">{dayData.asr_jamah}</td>
              <td className="p-3">{dayData.maghrib_begins}</td>
              <td className="p-3">{dayData.maghrib_jamah}</td>
              <td className="p-3">{dayData.isha_begins}</td>
              <td className="p-3">{dayData.isha_jamah}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </motion.div>
);

export const JummahTimesCard = ({ jummahTimes }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto"
  >
    <div className="bg-primary text-white px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
        Every Friday
      </p>
      <h3 className="text-lg sm:text-xl font-bold">Jummah Prayer Times</h3>
    </div>
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {jummahTimes.map((jummah, index) => (
          <Card key={index} className="border-t-4 border-t-primary">
            <CardContent className="pt-5 sm:pt-6">
              <h4 className="text-lg sm:text-xl font-bold mb-4">{jummah.name}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Khutbah:</span>
                  <span className="font-semibold">{jummah.khutbah}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Jama'ah:</span>
                  <span className="font-semibold">{jummah.prayer}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Please arrive early for the khutbah.
        </p>
      </div>
    </div>
  </motion.div>
);

export const RamadanTimesTable = ({ ramadanTimes }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden"
  >
    <div className="bg-primary text-white p-4 text-center">
      <h3 className="text-xl font-bold">Ramadan Prayer Times</h3>
    </div>
    <div className="p-6">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-600 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-300">
          Ramadan prayer times will be updated closer to the holy month.
        </p>
      </div>
      {ramadanTimes && ramadanTimes.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-600">
                  <th className="p-3 text-left">Day</th>
                  <th className="p-3 text-left">Suhoor Ends</th>
                  <th className="p-3 text-left">Iftar Time</th>
                  <th className="p-3 text-left">Taraweeh</th>
                </tr>
              </thead>
              <tbody>
                {ramadanTimes.map((day, index) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-200 dark:border-gray-600 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                  >
                    <td className="p-3 font-medium">{day.day}</td>
                    <td className="p-3">{day.suhoor}</td>
                    <td className="p-3">{day.iftar}</td>
                    <td className="p-3">{day.taraweeh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-600 dark:text-gray-300 py-8">
          No specific Ramadan schedule active for the current view.
        </p>
      )}
    </div>
  </motion.div>
);

export default function PrayerScheduleTabs({
  monthlyPrayerTimes,
  currentMonth,
  currentDate,
  jummahTimes,
  ramadanTimes,
  activeTab,
  setActiveTab,
}) {
  const contentRef = useRef(null);
  const handleTab = (value) => {
    setActiveTab(value);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        if (!contentRef.current) return;
        const headerOffset =
          (parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--jic-header-height'),
          ) || 220) + 60;
        const top = contentRef.current.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }),
    );
  };
  return (
    <section id="prayer-schedule" className="py-16 bg-gray-50 dark:bg-gray-800 scroll-mt-56">
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={handleTab} className="w-full max-w-6xl mx-auto">
          <div
            className="sticky z-20 flex justify-center mb-6"
            style={{ top: 'calc(var(--jic-header-height, 220px) + 8px)' }}
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md shadow-lg backdrop-blur-xl">
              <TabsTrigger value="daily">Monthly</TabsTrigger>
              <TabsTrigger value="jummah">Jummah</TabsTrigger>
              <TabsTrigger value="ramadan">Ramadan</TabsTrigger>
            </TabsList>
          </div>
          <div ref={contentRef} className="scroll-mt-56">
            <TabsContent value="daily" className="space-y-8">
              {activeTab === 'daily' && (
                <MonthlyPrayerTable
                  monthlyPrayerTimes={monthlyPrayerTimes}
                  currentMonth={currentMonth}
                  currentDate={currentDate}
                />
              )}
            </TabsContent>
            <TabsContent value="jummah" className="space-y-8">
              {activeTab === 'jummah' && <JummahTimesCard jummahTimes={jummahTimes} />}
            </TabsContent>
            <TabsContent value="ramadan" className="space-y-8">
              {activeTab === 'ramadan' && <RamadanTimesTable ramadanTimes={ramadanTimes} />}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
