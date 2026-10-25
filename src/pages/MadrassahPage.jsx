import React from 'react';
import { BookOpen, FileText, GraduationCap, Mail, Users, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';
import AboutSection from '@/components/sections/madrassah/AboutSection';

const overviewTiles = [
  {
    path: '/madrassah/enrolment',
    description: 'Apply for a pupil place.',
    icon: UserPlus,
    featured: true,
  },
  {
    path: '/madrassah/student-portal',
    description: 'Information for current pupils and parents.',
    icon: Users,
  },
  {
    path: '/madrassah/classes-courses',
    description: 'Explore learning topics and classes.',
    icon: BookOpen,
  },
  { path: '/madrassah/contact', description: 'Speak to the Madrassah team.', icon: Mail },
  { path: '/madrassah/policies', description: 'Policies and parent guidance.', icon: FileText },
  { path: '/education/courses', description: 'Looking for adult learning?', icon: GraduationCap },
];
export default function MadrassahPage() {
  return (
    <div className="page-transition jic-learning-page">
      <PageHeading title="Madrassah" eyebrow="Learning at JIC" icon={BookOpen}>
        Learning, character and a place to grow. Find a class for your child or information for your
        family.
      </PageHeading>
      <PageChoices items={overviewTiles} label="Madrassah choices" />
      <AboutSection />
    </div>
  );
}
