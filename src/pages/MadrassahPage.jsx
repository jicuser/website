import React from 'react';
import { BookOpen, FileText, Mail, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import AboutSection from '@/components/sections/madrassah/AboutSection';
import TestimonialsSection from '@/components/sections/madrassah/TestimonialsSection';
import CallToActionSection from '@/components/sections/madrassah/CallToActionSection';

const overviewTiles = [
  {
    title: 'Enrolment',
    description: 'Admissions, registration and information for new pupils.',
    path: '/madrassah/enrolment',
    icon: UserPlus,
  },
  {
    title: 'Classes & Courses',
    description: 'Explore classes, courses and learning opportunities.',
    path: '/madrassah/classes-courses',
    icon: BookOpen,
  },
  {
    title: 'Student Portal',
    description: 'Access student information and learning resources.',
    path: '/madrassah/student-portal',
    icon: FileText,
  },
  {
    title: 'Contact',
    description: 'Get in touch with the Madrassah team for help or enquiries.',
    path: '/madrassah/contact',
    icon: Mail,
  },
  {
    title: 'Policies',
    description: 'Read the key Madrassah policies and parent information.',
    path: '/madrassah/policies',
    icon: FileText,
  },
];

export default function MadrassahPage() {
  return (
    <div className="page-transition">
      <section className="pt-8 pb-2 md:pt-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
            {overviewTiles.map(({ title, description, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="group rounded-2xl border border-border/70 bg-card/80 px-4 py-5 text-center no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-5"
              >
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <strong className="block text-sm text-foreground md:text-base">{title}</strong>
                <span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground md:block">{description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <AboutSection />
      <TestimonialsSection />
      <CallToActionSection />
    </div>
  );
}
