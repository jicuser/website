import React from 'react';
import { BookOpen, FileText, Mail, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';
import AboutSection from '@/components/sections/madrassah/AboutSection';
import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';

const overviewTiles = [
  {
    description: 'Admissions, registration and information for new pupils.',
    path: '/madrassah/enrolment',
    icon: UserPlus,
  },
  {
    description: 'Explore classes, courses and learning opportunities.',
    path: '/madrassah/classes-courses',
    icon: BookOpen,
  },
  {
    description: 'Information and support for current pupils and parents.',
    path: '/madrassah/student-portal',
    icon: FileText,
  },
  {
    description: 'Get in touch with the Madrassah team for help or enquiries.',
    path: '/madrassah/contact',
    icon: Mail,
  },
  {
    description: 'Read the key Madrassah policies and parent information.',
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
      <CallToActionSection />
    </div>
  );
}
