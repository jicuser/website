import React from 'react';
import ProgramsSection from '@/components/sections/madrassah/ProgramsSection';
import SpecialCoursesSection from '@/components/sections/madrassah/SpecialCoursesSection';

export default function ClassesCoursesPage() {
  return (
    <div className="page-transition">
      <ProgramsSection />
      <SpecialCoursesSection />
    </div>
  );
}
