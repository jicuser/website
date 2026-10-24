import React from 'react';
import { BookOpen, GraduationCap, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import PageChoices from '@/components/PageChoices';

const choices = [
  {
    path: '/madrassah',
    description: 'Classes and parent information.',
    icon: GraduationCap,
  },
  {
    path: '/education/courses',
    description: 'Classes for adult learners.',
    icon: BookOpen,
  },
  {
    path: '/education/enrolment',
    description: 'Find where to register.',
    icon: UserPlus,
  },
];
export default function EducationPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Education & Madrassah">
        Find classes, course details and enrolment information.
      </PageHeading>
      <PageChoices items={choices} label="Education choices" />
      <div className="guidance-page-width">
        <GuidancePanel journeyId="education" />
      </div>
    </div>
  );
}
