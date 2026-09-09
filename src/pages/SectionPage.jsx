import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import { ArrowLeft } from 'lucide-react';

const MADRASSAH_LINKS = [
  { name: 'About Madrassah', to: '/madrassah' },
  { name: 'Programmes', to: '/madrassah/programs' },
  { name: 'Enrolment', to: '/madrassah/enrolment' },
  { name: 'Policies', to: '/madrassah/policies' },
];

export default function SectionPage({ eyebrow, title, intro = 'Content for this page will be added next.', backTo, backLabel = 'Back' }) {
  const { pathname } = useLocation();
  const showMadrassahNav = pathname === '/madrassah' || ['/madrassah/programs','/madrassah/enrolment','/madrassah/policies'].some(path => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {showMadrassahNav && (
        <nav className="jic-local-subnav mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Madrassah sections">
          {MADRASSAH_LINKS.map(item => {
            const current = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={current ? 'page' : undefined}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition ${current ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-white/10 bg-white/5 text-foreground hover:border-amber-400/30 hover:text-amber-300'}`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      )}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-3xl sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p>
        <ManagedPageContent fallbackTitle={title} fallbackBody={intro}/>
        {backTo && (
          <Link to={backTo} className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur-2xl transition hover:bg-white/10">
            <ArrowLeft size={16}/>{backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
