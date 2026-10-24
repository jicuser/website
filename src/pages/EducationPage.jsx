import React from 'react';
import { useContent } from '@/context/ContentContext';
import { GUIDED_HELP } from '@/content/guidedHelp';
import { readGuidedHelp } from '@/lib/guidedHelp';
import GuidedHelp from '@/components/services/GuidedHelp';
import '@/styles/services.css';
import { BookOpen, GraduationCap, UserPlus } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
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
  const { getContent } = useContent();
  let page = {};
  try {
    page = JSON.parse(getContent('page:/education', '{}')) || {};
  } catch {}
  const journey = readGuidedHelp(page.guidedJourney, GUIDED_HELP['/education']);
  return (
    <div className="page-transition education-overview">
      <PageHeading title="Education & Madrassah">
        Find classes, course details and enrolment information.
      </PageHeading>
      <GuidedHelp key={JSON.stringify(journey)} journey={journey} />
      <PageChoices items={choices} label="Education choices" />
    </div>
  );
}
