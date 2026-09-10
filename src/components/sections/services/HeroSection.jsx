import React from 'react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="bg-gray-50 py-7 dark:bg-gray-800 md:py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">JIC Services</p>
          <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">Our Services</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-300 md:text-base">
            Prayer, family and community services from Jamatia Islamic Centre.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
