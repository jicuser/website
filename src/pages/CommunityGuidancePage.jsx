import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';
import ManagedPageContent from '@/components/ManagedPageContent';
import GuidancePanel, { GuidanceLink, UrgentHelp } from '@/features/guidance/GuidancePanel';
import { GUIDANCE_PAGES } from '@/features/guidance/journeys';

export default function CommunityGuidancePage({ kind }) {
  const page = GUIDANCE_PAGES[kind];
  return (
    <div className="community-guidance-page">
      <Helmet>
        <title>{page.title} | Jamatia Islamic Centre</title>
        <meta name="description" content={page.intro} />
      </Helmet>
      <Link className="guidance-back-link" to="/services">
        <ArrowLeft size={16} aria-hidden="true" /> Community Hub
      </Link>
      <header className="community-guidance-heading">
        <ManagedPageContent fallbackTitle={page.title} fallbackBody={page.intro} />
      </header>
      {['support', 'family'].includes(kind) && <UrgentHelp />}
      <GuidancePanel journeyId={page.journey} defaultOpen />
      <nav className="guidance-direct-links" aria-label="Browse directly">
        <span>Go straight to</span>
        {page.links.map((item) => (
          <GuidanceLink key={item.to} item={item} />
        ))}
      </nav>
      {page.note && <p className="guidance-service-note">{page.note}</p>}
    </div>
  );
}
