import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';
    import { Sun, Moon, Sunrise, Sunset, Clock } from 'lucide-react';

    const TodaysPrayerTimesSection = ({ currentDate, todaysTimes }) => {
      if (!todaysTimes) {
        return (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <p className="text-center text-xl">Today's prayer times are not available. Please check back later or contact us.</p>
            </div>
          </section>
        );
      }

      const prayerTimesDisplayData = [
        { name: 'Fajr', time: todaysTimes.fajr, jamaah: todaysTimes.jamaah_fajr, icon: <Sunrise className="h-6 w-6 text-primary" /> },
        { name: 'Sunrise', time: todaysTimes.sunrise, icon: <Sun className="h-6 w-6 text-amber-500" /> },
        { name: 'Dhuhr', time: todaysTimes.dhuhr, jamaah: todaysTimes.jamaah_dhuhr, icon: <Sun className="h-6 w-6 text-primary" /> },
        { name: 'Asr', time: todaysTimes.asr, jamaah: todaysTimes.jamaah_asr, icon: <Sun className="h-6 w-6 text-primary" /> },
        { name: 'Maghrib', time: todaysTimes.maghrib, jamaah: todaysTimes.jamaah_maghrib, icon: <Sunset className="h-6 w-6 text-primary" /> },
        { name: 'Isha', time: todaysTimes.isha, jamaah: todaysTimes.jamaah_isha, icon: <Moon className="h-6 w-6 text-primary" /> }
      ];

      return (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
              >
                <div className="bg-primary text-white p-6 text-center">
                  <h2 className="text-2xl font-bold">Today's Prayer Times</h2>
                  <p className="text-white/80">
                    {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
                  {prayerTimesDisplayData.map((prayer, index) => (
                    <Card key={index} className="border-none shadow-none bg-gray-50 dark:bg-gray-700">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="mb-2">{prayer.icon}</div>
                        <h3 className="font-bold text-lg">{prayer.name}</h3>
                        <p className="text-primary dark:text-primary text-xl font-semibold">{prayer.time}</p>
                        {prayer.jamaah && prayer.jamaah !== 'N/A' && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{prayer.jamaah}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>Prayer times are for Jamatia Islamic Centre, Birmingham, UK.</p>
                  <p>Times may vary slightly. Please arrive a few minutes before Jama'ah.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      );
    };

    export default TodaysPrayerTimesSection;