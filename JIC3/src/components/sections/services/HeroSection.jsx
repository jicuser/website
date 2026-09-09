import React from 'react';
    import { motion } from 'framer-motion';

    const HeroSection = () => {
      return (
        <section className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Services</h1>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  Jamatia Islamic Centre offers a wide range of services to meet the spiritual, educational, and community needs of Muslims in our area. Explore our services below.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      );
    };

    export default HeroSection;