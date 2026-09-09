import React from 'react';
    import HeroSection from '@/components/sections/madrassah/HeroSection';
    import AboutSection from '@/components/sections/madrassah/AboutSection';
    import ProgramsSection from '@/components/sections/madrassah/ProgramsSection';
    import SpecialCoursesSection from '@/components/sections/madrassah/SpecialCoursesSection';
    import EnrollmentSection from '@/components/sections/madrassah/EnrollmentSection';
    import TestimonialsSection from '@/components/sections/madrassah/TestimonialsSection';
    import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';
    import EnrollmentForm from '@/components/sections/madrassah/EnrollmentForm';

    const MadrassahPage = () => {
      return (
        <div className="page-transition pt-24">
          <HeroSection />
          <AboutSection />
          <ProgramsSection />
          <SpecialCoursesSection />
          <section id="enrollment" className="py-16 bg-gray-50 dark:bg-gray-800">
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