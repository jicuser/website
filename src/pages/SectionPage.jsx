import React from 'react';
import { Link } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import { ArrowLeft } from 'lucide-react';

export default function SectionPage({ eyebrow, title, intro = 'Content for this page will be added next.', backTo, backLabel = 'Back' }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-3xl sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p>
        <ManagedPageContent fallbackTitle={title} fallbackBody={intro}/>
        {backTo && (
          <Link to={backTo} className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur-2xl transition hover:bg-white/10">
            <ArrowLeft size={16}/>{backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
