import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: BookOpen, title: 'Quranic Studies', description: 'Tajweed, Hifz & Tafsir' },
  { icon: Users, title: 'Islamic Values', description: 'Character & moral development' },
  { icon: Award, title: 'Learning Support', description: 'A supportive learning environment' },
];

const HeroSection = () => {
  return (
    <section className="relative bg-background text-foreground overflow-hidden py-10 md:py-16">
      <div className="absolute inset-0 islamic-pattern opacity-5 z-0" />
      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.22em] text-primary font-semibold mb-3">Jamatia Islamic Centre</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            Madrassah
          </h1>
          <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Nurturing young minds with Islamic knowledge, values and a strong sense of community.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-card/70 backdrop-blur-sm p-4 rounded-2xl border border-border text-center">
              <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
