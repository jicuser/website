import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';

const choices = [
  {
    path: '/madrassah/enrolment',
    description: 'Apply for a child to join the Madrassah.',
    icon: GraduationCap,
  },
  {
    path: '/education/courses',
    description: 'Choose a course to see its registration options.',
    icon: BookOpen,
  },
];
export default function EducationEnrolmentPage() {
  return (
    <section className="page-transition">
      <PageHeading title="Enrolment">Who would you like to enrol?</PageHeading>
      <PageChoices items={choices} label="Enrolment options" />
    </section>
  );
}
