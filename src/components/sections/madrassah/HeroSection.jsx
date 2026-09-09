import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Award } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative py-20 md:py-32 bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 islamic-pattern opacity-5 z-0"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-gray-900 dark:text-white">
                Jamatia Islamic Centre Madrassah
              </h1>
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0">
                Nurturing young minds with Islamic knowledge, values, and a strong sense of community.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                
              </div>
            </motion.div>
          </div>
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="relative rounded-xl overflow-hidden shadow-2xl"
            >
              <img 
                src="https://storage.googleapis.com/hostinger-horizons-assets-prod/6d6be6eb-ad37-41f6-b510-19ea41b9028a/b4cad674da90c42b10367d7c50b4ea75.png" 
                alt="Jamatia Islamic Centre Madrassah building" 
                className="w-full h-auto object-cover aspect-video md:aspect-[16/9]" 
              />
              <div className="absolute inset-0 bg-black/10 dark:bg-black/30"></div>
            </motion.div>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center"
        >
          {[
            { icon: <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />, title: "Quranic Studies", description: "Tajweed, Hifz & Tafsir" },
            { icon: <Users className="h-8 w-8 mx-auto mb-2 text-primary" />, title: "Islamic Values", description: "Character & Moral Development" },
            { icon: <Award className="h-8 w-8 mx-auto mb-2 text-primary" />, title: "Academic Excellence", description: "Supportive Learning Environment" },
          ].map((item, index) => (
            <div key={index} className="bg-card/80 dark:bg-card/50 backdrop-blur-sm p-6 rounded-lg shadow-lg hover:bg-card transition-colors duration-300 border border-border">
              {item.icon}
              <h3 className="text-xl font-semibold mb-1 text-card-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;