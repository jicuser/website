import React from 'react';
import PageHeading from '@/components/PageHeading';
import ProgramsSection from '@/components/sections/madrassah/ProgramsSection';
import SpecialCoursesSection from '@/components/sections/madrassah/SpecialCoursesSection';

export default function ClassesCoursesPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Madrassah Classes">
        Explore the programme information below or contact the Madrassah about a place.
      </PageHeading>
      <ProgramsSection />
      <SpecialCoursesSection />
    </div>
  );
}
