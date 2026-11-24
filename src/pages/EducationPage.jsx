import React from 'react';
import { BookOpen, GraduationCap, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import PageChoices from '@/components/PageChoices';

const choices = [
  {
    path: '/madrassah',
    featured: true,
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
  {
    path: '/education/programmes',
    description: 'Published programmes and upcoming learning.',
    icon: BookOpen,
  },
];
export default function EducationPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Education & Madrassah" eyebrow="Community Hub" icon={GraduationCap}>
        Find classes, course details and enrolment information.
      </PageHeading>
      <PageChoices items={choices} label="Education choices" />
      <details className="jic-details-section">
        <summary>Help choosing a class</summary>
        <div>
          <GuidancePanel journeyId="education" />
        </div>
      </details>
    </div>
  );
}
