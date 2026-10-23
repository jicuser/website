import React from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, GraduationCap, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import { serviceEnquiryForPath } from '@/lib/serviceEnquiries';

const PAGE_DESCRIPTIONS = {
  '/services/daily-prayers':
    'Check today’s prayer start and congregation times before visiting JIC.',
  '/services/jummah': 'Check the published Jummah times and plan your visit to the centre.',
  '/services/quran-classes':
    'Explore published learning opportunities, or ask the team which class may suit you.',
  '/madrassah/contact':
    'Ask the Madrassah team about classes, admissions or support for a current pupil. Include the details needed for your enquiry so the team can advise you.',
  '/madrassah/policies':
    'Ask the Madrassah team for the current policies and parent information relevant to your child. The team can help with questions about requirements or procedures.',
  '/madrassah/student-portal':
    'Information for current pupils and parents. Contact the Madrassah team about your child’s classes or to check whether online access is available for you.',
  '/youth/projects':
    'Ask about current youth projects and ways young people can take part. The team can explain what is available and any participation requirements.',
  '/youth/activities':
    'Explore the types of youth activities at JIC, then ask the team about current availability, age suitability and how to take part.',
  '/youth/trips-events':
    'Ask the team about any upcoming youth trips or events and the arrangements for taking part. Confirm dates, availability and consent requirements directly.',
  '/youth/volunteering':
    'Tell the team how you would like to help and when you are available. They can discuss suitable opportunities and any checks or consent needed.',
  '/youth/classes-skills':
    'Explore published classes and learning opportunities, or ask the team what is suitable for your age and interests.',
};

const PAGE_ACTIONS = {
  '/services/daily-prayers': [
    { label: 'Today’s prayer times', to: '/prayer-times', icon: CalendarDays },
  ],
  '/services/jummah': [{ label: 'Jummah times', to: '/prayer-times/jummah', icon: CalendarDays }],
  '/services/quran-classes': [{ label: 'Find classes', to: '/education', icon: GraduationCap }],
  '/services/community-services': [
    { label: 'Community services', to: '/services/community', icon: ArrowRight },
  ],
  '/projects/community-hall': [
    { label: 'Book the hall', to: '/services/hall-booking', icon: CalendarDays },
    { label: 'Contact JIC', to: '/contact', icon: Mail },
  ],
  '/projects/madrassah-floor': [
    { label: 'Visit Madrassah', to: '/madrassah', icon: GraduationCap },
    { label: 'Classes & Courses', to: '/madrassah/classes-courses', icon: ArrowRight },
  ],
  '/projects/main-prayer-hall': [
    { label: 'Prayer times', to: '/prayer-times', icon: CalendarDays },
  ],
  '/funerals/what-to-do': [
    { label: 'Send a funeral support enquiry', to: '/forms/funeral-enquiry', icon: Mail },
  ],
  '/madrassah/student-portal': [
    { label: 'Contact Madrassah', to: '/madrassah/contact', icon: Mail },
    { label: 'Classes & courses', to: '/madrassah/classes-courses', icon: GraduationCap },
  ],
  '/madrassah/policies': [
    { label: 'Ask about Madrassah policies', to: '/madrassah/contact', icon: Mail },
  ],
  '/madrassah/contact': [
    { label: 'Send a Madrassah enquiry', to: '/forms/madrassah-enquiry', icon: Mail },
    { label: 'Pupil enrolment', to: '/madrassah/enrolment', icon: GraduationCap },
  ],
  '/youth/projects': [
    { label: 'Youth at JIC', to: '/youth', icon: ArrowRight },
    { label: 'Ask about youth projects', to: '/contact', icon: Mail },
  ],
  '/youth/activities': [
    { label: 'Explore youth activities', to: '/youth', icon: ArrowRight },
    { label: 'Ask about taking part', to: '/contact', icon: Mail },
  ],
  '/youth/trips-events': [{ label: 'Ask about trips & events', to: '/contact', icon: Mail }],
  '/youth/volunteering': [
    { label: 'Ask about volunteering', to: '/get-involved/volunteer', icon: ArrowRight },
  ],
  '/youth/classes-skills': [
    { label: 'Explore classes & programmes', to: '/education/programmes', icon: GraduationCap },
    { label: 'Ask about youth learning', to: '/contact', icon: Mail },
  ],
};

export default function SectionPage({
  eyebrow,
  title,
  intro = 'Please contact the centre for information and availability.',
  backTo,
  backLabel = 'Back',
}) {
  const { pathname } = useLocation();
  const enquiry = serviceEnquiryForPath(pathname);
  const actions = (enquiry
    ? [
        {
          label: `Send ${enquiry.title.toLowerCase()}${enquiry.slug === 'funeral-enquiry' ? ' enquiry' : ''}`,
          to: `/forms/${enquiry.slug}`,
          icon: Mail,
        },
      ]
    : PAGE_ACTIONS[pathname]) || [{ label: 'Contact the centre', to: '/contact', icon: Mail }];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <ManagedPageContent
          fallbackTitle={title}
          fallbackBody={enquiry?.description || PAGE_DESCRIPTIONS[pathname] || intro}
        />

        {(actions.length > 0 || backTo) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map(({ label, to, href, icon: Icon }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40"
                >
                  <Icon size={16} />
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  to={to}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ),
            )}

            {backTo && (
              <Link
                to={backTo}
                className="inline-flex min-h-[44px] items-center gap-2 px-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={15} />
                {backLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
