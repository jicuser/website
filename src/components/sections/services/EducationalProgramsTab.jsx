import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import PageChoices from '@/components/PageChoices';

const choices = [
  {
    path: '/madrassah',
    description: 'Pupil classes and parent information, including enrolment.',
    icon: GraduationCap,
  },
  {
    path: '/education/courses',
    description: 'Browse adult classes and their registration details.',
    icon: BookOpen,
  },
];
export default function EducationalProgramsTab() {
  return <PageChoices items={choices} label="Classes and education" />;
}
