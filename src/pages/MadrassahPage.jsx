import React from 'react';
import HeroSection from '@/components/sections/madrassah/HeroSection';
import AboutSection from '@/components/sections/madrassah/AboutSection';
import TestimonialsSection from '@/components/sections/madrassah/TestimonialsSection';
import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';

export default function MadrassahPage() {
  return (
    <div className="page-transition">
      <HeroSection />
      <AboutSection />
      <TestimonialsSection />
      <CallToActionSection />
    </div>
  );
}
