import React from 'react';
import HeroSection from '@/components/sections/madrassah/HeroSection';
import AboutSection from '@/components/sections/madrassah/AboutSection';
import ProgramsSection from '@/components/sections/madrassah/ProgramsSection';
import SpecialCoursesSection from '@/components/sections/madrassah/SpecialCoursesSection';
import TestimonialsSection from '@/components/sections/madrassah/TestimonialsSection';
import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';
import EnrollmentForm from '@/components/sections/madrassah/EnrollmentForm';

const MadrassahPage = () => {
  return (
    <div className="page-transition pt-24">
      <HeroSection />
      <AboutSection />
      <div id="classes" className="jic-anchor-target"><ProgramsSection /></div>
      <div id="special-courses" className="jic-anchor-target"><SpecialCoursesSection /></div>
      <section id="enrollment" className="jic-anchor-target py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <EnrollmentForm />
        </div>
      </section>
      <TestimonialsSection />
      <CallToActionSection />
    </div>
  );
};

export default MadrassahPage;
