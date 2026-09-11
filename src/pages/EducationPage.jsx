import React from 'react';
import { BookOpen, FileText, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const educationTiles = [
  {
    title: 'Madrassah',
    description: 'Madrassah overview, enrolment, policies and parent information.',
    path: '/madrassah',
    icon: BookOpen,
  },
  {
    title: 'Classes & Courses',
    description: 'Browse current classes, courses and learning opportunities.',
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
    title: 'Enrolment',
    description: 'Admissions and registration information for new pupils.',
    path: '/madrassah/enrolment',
    icon: UserPlus,
  },
];

export default function EducationPage() {
  return (
    <div className="page-transition">
      <section className="pt-8 pb-10 md:pt-10 md:pb-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-6 max-w-3xl text-center md:mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Education</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-4xl">
              Learn at Jamatia Islamic Centre
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Choose an education area below. Each section keeps its own tabs visible so you can
              move between related pages without going back to the main menu.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {educationTiles.map(({ title, description, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="group rounded-2xl border border-border/70 bg-card/80 px-4 py-5 text-center no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-5"
              >
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <strong className="block text-sm text-foreground md:text-base">{title}</strong>
                <span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground md:block">
                  {description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
