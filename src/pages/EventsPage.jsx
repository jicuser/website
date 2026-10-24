import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeading from '@/components/PageHeading';
import { EventRows } from '@/components/home/WhatsOn';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
export default function EventsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Math.min(999, Number.parseInt(params.get('page') || '1', 10) - 1 || 0));
  const { events, loading, stale } = useHomeLiveContent({ eventLimit: 9, eventOffset: page * 8 });
  return (
    <div className="service-page events-page">
      <PageHeading title="What’s on">
        Upcoming dates at JIC. Open an event for details and registration where available.
      </PageHeading>
      <nav className="hub-utility-links" aria-label="Programme directories">
        <Link to="/education/programmes">All programmes & posters</Link>
        <Link to="/youth">Youth activities</Link>
      </nav>
      {loading ? (
        <p role="status">Loading events…</p>
      ) : (
        <>
          <EventRows rows={events.slice(0, 8).map((event) => ({ ...event, kind: 'event' }))} />
          {!events.length && (
            <p>
              {stale
                ? 'Events could not be loaded. Please try again.'
                : 'No upcoming events are listed on this page. Browse the published programmes for regular activities.'}
            </p>
          )}
          <nav className="compact-pagination" aria-label="Event pages">
            <button
              type="button"
              disabled={!page}
              onClick={() => setParams({ page: String(page) })}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              type="button"
              disabled={events.length <= 8 || stale}
              onClick={() => setParams({ page: String(page + 2) })}
            >
              Next
            </button>
          </nav>
        </>
      )}
      {stale && events.length > 0 && (
        <p role="status">Showing the last loaded events. Updates are temporarily unavailable.</p>
      )}
    </div>
  );
}
