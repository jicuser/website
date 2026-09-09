import React from 'react';
    import { motion } from 'framer-motion';

    const PrayerGuidelinesSection = () => (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Prayer Guidelines</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Important information about prayers at Jamatia Islamic Centre.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6"
            >
              <h3 className="text-xl font-bold mb-4">General Guidelines</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Please arrive a few minutes before prayer time</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Perform wudu (ablution) before entering the prayer hall</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Turn off or silence mobile phones during prayers</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Maintain proper attire and modesty</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Follow the Imam's lead during congregational prayers</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Keep the prayer area clean and tidy</li>
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6"
            >
              <h3 className="text-xl font-bold mb-4">Facilities</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Separate prayer areas for men and women</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Clean and spacious wudu (ablution) facilities</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Prayer mats provided, but you may bring your own</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Copies of the Quran available for use</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Wheelchair accessible entrances and prayer areas</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>Parking available for worshippers</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
    );

    export default PrayerGuidelinesSection;