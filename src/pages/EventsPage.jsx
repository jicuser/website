import React from 'react';
import PageHeading from '@/components/PageHeading';
import CommunityProgrammeList from '@/features/home/CommunityProgrammeList';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import '@/features/guidance/guidance.css';
export default function EventsPage() {
  const { events, loading, stale } = useHomeLiveContent({ eventLimit: 100 });
  return (
    <div className="guidance-page-width">
      <PageHeading title="Events & programmes" eyebrow="What’s on at JIC">
        Published activities, gatherings and notices.
      </PageHeading>
      {loading && <p role="status">Loading events…</p>}
      {stale && (
        <p role="status">Event updates could not be loaded. Please check with the centre.</p>
      )}
      <CommunityProgrammeList events={events} listing />
    </div>
  );
}
