import React from 'react';
import AboutSection from '@/components/sections/madrassah/AboutSection';
import TestimonialsSection from '@/components/sections/madrassah/TestimonialsSection';
import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';

export default function MadrassahPage() {
  return (
    <div className="page-transition">
      <AboutSection />
      <TestimonialsSection />
      <CallToActionSection />
    </div>
  );
}
