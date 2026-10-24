import React from 'react';
import { BookOpen, FileText, Mail, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';
import AboutSection from '@/components/sections/madrassah/AboutSection';

const overviewTiles = [
  {
    description: 'Apply for a pupil place.',
    path: '/madrassah/enrolment',
    icon: UserPlus,
  },
  {
    description: 'Explore classes and courses.',
    path: '/madrassah/classes-courses',
    icon: BookOpen,
  },
  {
    description: 'Parent and pupil information.',
    path: '/madrassah/student-portal',
    icon: FileText,
  },
  {
    description: 'Speak to the Madrassah team.',
    path: '/madrassah/contact',
    icon: Mail,
  },
  {
    description: 'Policies and guidance.',
    path: '/madrassah/policies',
    icon: FileText,
  },
];

export default function MadrassahPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Madrassah">
        Pupil classes, enrolment and information for parents.
      </PageHeading>
      <PageChoices items={overviewTiles} label="Madrassah choices" />
      <AboutSection />
    </div>
  );
}
