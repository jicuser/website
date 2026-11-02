import React, { useRef } from 'react';
import MonthlyPrayerTable from './MonthlyPrayerTable';
export { default as MonthlyPrayerTable } from './MonthlyPrayerTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import JummahTimesCard from './CompactJummah';
export { JummahTimesCard };

export const RamadanTimesTable = ({ ramadanTimes }) => (
  <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden">
    <div className="bg-primary text-white p-4 text-center">
      <h3 className="text-xl font-bold">Ramadan Prayer Times</h3>
    </div>
    <div className="p-6">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-600 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-300">
          Contact the centre for the current Ramadan timetable.
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
                  <tr key={index} className={`border-b border-gray-200 dark:border-gray-600 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
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
          No Ramadan timetable is currently available here.
        </p>
      )}
    </div>
  </div>
);

export default function PrayerScheduleTabs({
  monthlyPrayerTimes, currentMonth, currentDate, jummahTimes, ramadanTimes, activeTab, setActiveTab,
}) {
  const contentRef = useRef(null);
  const handleTab = (value) => {
    setActiveTab(value);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        if (!contentRef.current) return;
        const headerOffset = (Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--jic-prayer-sticky-offset'),
        ) || 0) + 60;
        const top = contentRef.current.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }),
    );
  };
  return (
    <section id="prayer-schedule" className="py-16 bg-gray-50 dark:bg-gray-800 scroll-mt-56">
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={handleTab} className="w-full max-w-6xl mx-auto">
          <div className="sticky z-20 flex justify-center mb-6" style={{ top: 'calc(var(--jic-prayer-sticky-offset, 0px) + 8px)' }}>
            <TabsList className="grid grid-cols-3 w-full max-w-md shadow-lg backdrop-blur-xl">
              <TabsTrigger value="daily">Monthly</TabsTrigger>
              <TabsTrigger value="jummah">Jummah</TabsTrigger>
              <TabsTrigger value="ramadan">Ramadan</TabsTrigger>
            </TabsList>
          </div>
          <div ref={contentRef} className="scroll-mt-56">
            <TabsContent value="daily" className="space-y-8">
              {activeTab === 'daily' && <MonthlyPrayerTable monthlyPrayerTimes={monthlyPrayerTimes} currentMonth={currentMonth} currentDate={currentDate} jummahTimes={jummahTimes} />}
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
