import React from 'react';
    import { motion } from 'framer-motion';

    const SpecialServicesSection = () => {
      return (
        <section className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Special Services</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                We also offer these special services to meet specific needs of our community members.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6"
              >
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Marriage Services</h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Nikah (Islamic marriage) ceremonies
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Pre-marriage counseling
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Marriage certificate issuance
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Marriage hall rental for ceremonies
                  </li>
                </ul>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6"
              >
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Funeral Services</h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Janazah (funeral) prayers
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Guidance on Islamic burial procedures
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Coordination with local cemeteries
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Support for bereaved families
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>
      );
    };

    export default SpecialServicesSection;