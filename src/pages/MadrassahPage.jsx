import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '@/components/sections/madrassah/HeroSection';
import AboutSection from '@/components/sections/madrassah/AboutSection';
import ProgramsSection from '@/components/sections/madrassah/ProgramsSection';
import SpecialCoursesSection from '@/components/sections/madrassah/SpecialCoursesSection';
import TestimonialsSection from '@/components/sections/madrassah/TestimonialsSection';
import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';
import EnrollmentForm from '@/components/sections/madrassah/EnrollmentForm';

const MADRASSAH_LINKS = [
  { name: 'About Madrassah', to: '/madrassah' },
  { name: 'Programmes', to: '/madrassah/programs' },
  { name: 'Enrolment', to: '/madrassah/enrolment' },
  { name: 'Policies', to: '/madrassah/policies' },
];

const MadrassahPage = () => {
  return (
    <div className="page-transition pt-24">
      <nav className="mx-auto mb-4 flex max-w-5xl gap-2 overflow-x-auto px-4 pb-1" aria-label="Madrassah sections">
        {MADRASSAH_LINKS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="shrink-0 rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-card-foreground backdrop-blur-md transition hover:border-primary/40 hover:text-primary"
          >
            {item.name}
          </Link>
        ))}
      </nav>
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
