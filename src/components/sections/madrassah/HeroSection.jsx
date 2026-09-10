import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: BookOpen, title: 'Quranic Studies', description: 'Tajweed, Hifz & Tafsir' },
  { icon: Users, title: 'Islamic Values', description: 'Character & moral development' },
  { icon: Award, title: 'Learning Support', description: 'A supportive learning environment' },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-7 text-foreground md:py-10">
      <div className="absolute inset-0 z-0 islamic-pattern opacity-5" />
      <div className="container relative z-10 mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Education</p>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-4xl">Madrassah</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-300 md:text-base">
            Islamic learning, character development and support for young people.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
          className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
        >
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-border bg-card/70 p-3 text-center backdrop-blur-sm sm:p-4">
              <Icon className="mx-auto mb-2 h-5 w-5 text-primary sm:h-6 sm:w-6" />
              <h3 className="text-xs font-semibold text-card-foreground sm:text-sm">{title}</h3>
              <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
