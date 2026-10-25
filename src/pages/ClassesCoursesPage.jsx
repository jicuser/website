import React from 'react';
import PageHeading from '@/components/PageHeading';
import ProgramsSection from '@/components/sections/madrassah/ProgramsSection';
import SpecialCoursesSection from '@/components/sections/madrassah/SpecialCoursesSection';

export default function ClassesCoursesPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Madrassah Classes" eyebrow="Learning at JIC">
        Explore the learning topics below. The Madrassah can confirm current classes, times and
        places.
      </PageHeading>
      <ProgramsSection />
      <SpecialCoursesSection />
    </div>
  );
}
