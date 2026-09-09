import React from 'react';
    import { motion } from 'framer-motion';
    import { Calendar, Clock } from 'lucide-react';

    const PrayerTimesHeroSection = ({ formattedDate, formattedTime }) => (
      <section className="py-16 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold mb-4">Prayer Times</h1>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                Join us for prayers at Jamatia Islamic Centre. Below are the prayer times for today and the current month.
              </p>
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-6">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  <span>{formattedDate}</span>
                </div>
                <div className="hidden md:block text-gray-400 dark:text-gray-600">|</div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );

    export default PrayerTimesHeroSection;