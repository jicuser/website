import React from 'react';
import { BookOpen, GraduationCap, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import PageChoices from '@/components/PageChoices';

const choices = [
  {
    path: '/madrassah',
    description: 'Classes, pupil enrolment and parent information.',
    icon: GraduationCap,
  },
  {
    path: '/education/courses',
    description: 'Course details and registration for adult learners.',
    icon: BookOpen,
  },
  {
    path: '/education/enrolment',
    description: 'Find the right registration route for a child or an adult.',
    icon: UserPlus,
  },
];
export default function EducationPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Education & Madrassah">
        Find classes, course details and enrolment information.
      </PageHeading>
      <div className="guidance-page-width">
        <GuidancePanel journeyId="education" />
      </div>
      <PageChoices items={choices} label="Education choices" />
    </div>
  );
}
