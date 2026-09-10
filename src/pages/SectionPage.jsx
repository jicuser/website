import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ManagedPageContent from '@/components/ManagedPageContent';

/**
 * Reusable content page for routes defined in src/content/sectionRoutes.js.
 * Section navigation is owned globally by UnifiedHeader.
 */
export default function SectionPage({
  eyebrow,
  title,
  intro = 'Please contact the centre for information and availability.',
  backTo,
  backLabel = 'Back',
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>

        <ManagedPageContent fallbackTitle={title} fallbackBody={intro} />

        {backTo && (
          <Link
            to={backTo}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition hover:bg-muted"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        )}
      </section>
    </div>
  );
}
