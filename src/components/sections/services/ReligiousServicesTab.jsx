import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Book, Clock, Heart, Headphones, Loader2 } from 'lucide-react';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import MosqueSymbol from '@/components/icons/MosqueSymbol';

const religiousServices = [
  {
    icon: <MosqueSymbol className="h-10 w-10 text-primary" />,
    title: 'Daily Prayers',
    description:
      'Five daily prayers in congregation led by our qualified Imams. Join us for spiritual connection and community bonding.',
  },
  {
    icon: <Calendar className="h-10 w-10 text-primary" />,
    title: 'Friday Sermons',
    description:
      'Weekly Jummah prayers with inspiring khutbahs addressing contemporary issues and Islamic guidance.',
  },
  {
    icon: <Book className="h-10 w-10 text-primary" />,
    title: 'Quran Recitation',
    description:
      'Regular Quran recitation sessions with proper tajweed rules and reflection on meanings.',
  },
  {
    icon: <Clock className="h-10 w-10 text-primary" />,
    title: 'Ramadan Services',
    description:
      'Special taraweeh prayers, iftar gatherings, and spiritual programs during the holy month.',
  },
  {
    icon: <Heart className="h-10 w-10 text-primary" />,
    title: 'Eid Celebrations',
    description: 'Festive Eid prayers and community celebrations for Eid-ul-Fitr and Eid-ul-Adha.',
  },
  {
    icon: <Headphones className="h-10 w-10 text-primary" />,
    title: 'Islamic Counseling',
    description: 'Personal spiritual guidance and counseling services by our knowledgeable Imams.',
  },
];

const PrayerTimeRow = ({ label, begins, jamaah }) => (
  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
    <td className="p-3 font-medium">{label}</td>
    <td className="p-3">{begins || 'N/A'}</td>
    <td className="p-3">{jamaah || 'N/A'}</td>
  </tr>
);

const ReligiousServicesTab = () => {
  const { todaysTimes, isLoadingPrayerTimes } = usePrayerTimes();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {religiousServices.map((service, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-all">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="mb-4 p-3 rounded-full bg-primary/10">{service.icon}</div>
                <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mt-8">
        <h3 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
          Today's Prayer Schedule
        </h3>
        {isLoadingPrayerTimes ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : todaysTimes ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-gray-900 dark:text-gray-100">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-3 text-left text-sm sm:text-base">Prayer</th>
                  <th className="p-3 text-left text-sm sm:text-base">Begins</th>
                  <th className="p-3 text-left text-sm sm:text-base">Jama'ah</th>
                </tr>
              </thead>
              <tbody>
                <PrayerTimeRow
                  label="Fajr"
                  begins={todaysTimes.fajr}
                  jamaah={todaysTimes.jamaah_fajr}
                />
                <PrayerTimeRow
                  label="Dhuhr"
                  begins={todaysTimes.dhuhr}
                  jamaah={todaysTimes.jamaah_dhuhr}
                />
                <PrayerTimeRow
                  label="Asr"
                  begins={todaysTimes.asr}
                  jamaah={todaysTimes.jamaah_asr}
                />
                <PrayerTimeRow
                  label="Maghrib"
                  begins={todaysTimes.maghrib}
                  jamaah={todaysTimes.jamaah_maghrib}
                />
                <PrayerTimeRow
                  label="Isha"
                  begins={todaysTimes.isha}
                  jamaah={todaysTimes.jamaah_isha}
                />
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-300 py-8">
            Today's prayer times are not available. Please check the full schedule or contact us.
          </p>
        )}
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Prayer times are subject to change. Please check our{' '}
          <a href="/prayer-times" className="text-primary hover:underline">
            Prayer Times page
          </a>{' '}
          for the most up-to-date schedule.
        </p>
      </div>
    </>
  );
};

export default ReligiousServicesTab;
