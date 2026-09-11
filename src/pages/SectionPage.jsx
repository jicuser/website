import React from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, GraduationCap, Mail, Phone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import { SITE } from '@/content/site';

const PAGE_ACTIONS = {
  '/projects/community-hall': [
    { label: 'Book the hall', to: '/services/hall-booking', icon: CalendarDays },
    { label: 'Contact JIC', to: '/contact', icon: Mail },
  ],
  '/projects/madrassah-floor': [
    { label: 'Visit Madrassah', to: '/madrassah', icon: GraduationCap },
    { label: 'Classes & Courses', to: '/madrassah/classes-courses', icon: ArrowRight },
  ],
  '/projects/madrassah-building': [
    { label: 'Visit Madrassah', to: '/madrassah', icon: GraduationCap },
    { label: 'Classes & Courses', to: '/madrassah/classes-courses', icon: ArrowRight },
  ],
  '/projects/main-prayer-hall': [
    { label: 'Prayer times', to: '/prayer-times', icon: CalendarDays },
  ],
  '/services/nikah': [
    { label: 'Contact JIC', to: '/contact', icon: Mail },
    { label: `Call ${SITE.phone}`, href: `tel:${SITE.phone.replace(/\s/g, '')}`, icon: Phone },
  ],
  '/funerals': [
    { label: 'Funeral support', to: '/funerals/contact-support', icon: ArrowRight },
    { label: `Call ${SITE.phone}`, href: `tel:${SITE.phone.replace(/\s/g, '')}`, icon: Phone },
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
  const actions = PAGE_ACTIONS[pathname] || [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <ManagedPageContent fallbackTitle={title} fallbackBody={intro} />

        {(actions.length > 0 || backTo) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map(({ label, to, href, icon: Icon }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40"
                >
                  <Icon size={16} />
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  to={to}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ),
            )}

            {backTo && (
              <Link
                to={backTo}
                className="inline-flex items-center gap-2 px-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={15} />
                {backLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
