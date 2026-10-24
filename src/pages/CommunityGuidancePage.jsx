import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';
import ManagedPageContent from '@/components/ManagedPageContent';
import { GuidanceLink, UrgentHelp } from '@/features/guidance/GuidancePanel';
import GuidanceTopics from '@/features/guidance/GuidanceTopics';
import { GUIDANCE_PAGES } from '@/features/guidance/journeys';

export default function CommunityGuidancePage({ kind }) {
  const page = GUIDANCE_PAGES[kind];
  return (
    <div className="community-guidance-page">
      <Helmet>
        <title>{page.title} | Jamatia Islamic Centre</title>
        <meta name="description" content={page.intro} />
      </Helmet>
      <div className="community-guidance-workspace">
        <header className="community-guidance-heading">
          <Link className="guidance-back-link guidance-eyebrow" to="/services">
            <ArrowLeft size={14} aria-hidden="true" /> JIC · Community Hub
          </Link>
          <ManagedPageContent
            className="is-unframed"
            fallbackTitle={page.title}
            fallbackBody={page.intro}
          />
        </header>
        {['support', 'family'].includes(kind) && <UrgentHelp />}
        <GuidanceTopics key={kind} journeyId={page.journey} />
      </div>
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
