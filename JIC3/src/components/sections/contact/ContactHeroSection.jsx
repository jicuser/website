import React from 'react';
    import { motion } from 'framer-motion';

    const ContactHeroSection = () => (
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                We'd love to hear from you! Whether you have a question about our services, want to join our community, or need any assistance, our team is here to help.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    );

    export default ContactHeroSection;