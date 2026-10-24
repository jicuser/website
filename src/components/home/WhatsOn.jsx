import React, { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ArrowRight } from 'lucide-react';
import usePosters from '@/hooks/usePosters';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { useContent } from '@/context/ContentContext';
import { posterAppearsOnPage } from '@/lib/programmePlacement';
import { pageUrl } from '@/lib/pageContent';
import { safeWebUrl } from '@/lib/video';
import { isPageVisible } from '@/lib/pageVisibility';
import { displayTime } from '@/lib/timetable';
import { homeWhatsOn } from '@/lib/whatsOn';
const ImageViewer = lazy(() => import('@/components/ImageViewer'));
const AnnouncementViewer = lazy(() => import('@/components/posters/AnnouncementViewer'));
export function EventRows({ rows }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <div className="whats-on-rows">
        {rows.map((item) => (
          <article key={item.key || item.id} className="whats-on-row">
            <span className="whats-on-symbol" aria-hidden="true">
              <CalendarDays size={21} />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>
                {item.event_date ? (
                  <>
                    <time dateTime={item.event_date}>
                      {new Date(`${item.event_date}T12:00:00`).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </time>
                    {item.start_time && ` · ${displayTime(item.start_time)}`}
                  </>
                ) : (
                  item.schedule || item.subtitle
                )}
              </p>
              {item.kind === 'event' ? (
                <details>
                  <summary>Event details</summary>
                  {item.location && <p>{item.location}</p>}
                  {item.description && <p>{item.description}</p>}
                  {safeWebUrl(item.registration_url) && (
                    <a href={safeWebUrl(item.registration_url)} target="_blank" rel="noreferrer">
                      Details & registration
                    </a>
                  )}
                  {item.programmeTo && <Link to={item.programmeTo}>Explore programme</Link>}
                  {safeWebUrl(item.poster_url) && (
                    <button
                      type="button"
                      onClick={() => setSelected({ ...item, image: item.poster_url })}
                    >
                      View poster
                    </button>
                  )}
                </details>
              ) : (
                <Link to={item.to || '/contact'}>
                  Explore programme <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
            {item.kind !== 'event' && (
              <button
                type="button"
                className="whats-on-poster"
                aria-label={`${item.kind === 'announcement' ? 'Read' : 'View'} ${item.title} ${item.kind === 'announcement' ? 'announcement' : 'poster'}`}
                onClick={() => setSelected(item)}
              >
                {item.image ? (
                  <img src={item.image} alt="" loading="lazy" width="40" height="56" />
                ) : (
                  'Read notice'
                )}
              </button>
            )}
          </article>
        ))}
      </div>
      <Suspense fallback={null}>
        {selected?.kind === 'announcement' ? (
          <AnnouncementViewer poster={selected} onClose={() => setSelected(null)} />
        ) : (
          selected && (
            <ImageViewer
              image={{
                title: selected.title,
                url: selected.image,
                alt: selected.alt || selected.title,
              }}
              onClose={() => setSelected(null)}
            >
              <a href={selected.image} target="_blank" rel="noreferrer">
                Open full-size poster
              </a>
            </ImageViewer>
          )
        )}
      </Suspense>
    </>
  );
}
export default function WhatsOn({ events, loading, stale }) {
  const posters = usePosters(),
    pages = usePublishedPages(),
    { getContent } = useContent();
  const visible = posters
    .filter((poster) => posterAppearsOnPage(poster, '/', pages))
    .map((poster) => {
      const page = pages.find((item) => item.source_poster_id === poster.id);
      return { ...poster, to: page ? pageUrl(page) : poster.to };
    })
    .filter((poster) => isPageVisible(getContent, poster.to));
  const rows = homeWhatsOn(events, visible);
  if (!rows.length && !loading && !stale) return null;
  return (
    <section className="jic-home-section home-whats-on" aria-labelledby="whats-on-title">
      <header>
        <h2 id="whats-on-title">What’s on</h2>
        {isPageVisible(getContent, '/events') && (
          <Link to="/events">
            All events & programmes <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>
      {loading && !rows.length ? (
        <p role="status">Loading what’s on…</p>
      ) : (
        <EventRows rows={rows} />
      )}
      {stale && (
        <p role="status">
          Event updates are temporarily unavailable. Please check details with the centre.
        </p>
      )}
    </section>
  );
}
