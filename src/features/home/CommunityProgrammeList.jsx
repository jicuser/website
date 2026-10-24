import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import usePosters from '@/hooks/usePosters';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { pageUrl } from '@/lib/pageContent';
import { posterAppearsOnPage, posterWebsiteLocations } from '@/lib/programmePlacement';
import { safeWebUrl } from '@/lib/video';
import { displayTime } from '@/lib/timetable';
import ImageViewer from '@/components/ImageViewer';
import AnnouncementViewer from '@/components/posters/AnnouncementViewer';
import { programmeFeed } from './programmeFeed';
import './programme-feed.css';

export default function CommunityProgrammeList({
  events = [],
  listing = false,
  placementPath = '/',
}) {
  const posters = usePosters();
  const pages = usePublishedPages();
  const { getContent } = useContent();
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(12);
  const published = posters
    .filter((item) =>
      listing
        ? posterWebsiteLocations(item, pages).length > 0
        : posterAppearsOnPage(item, placementPath, pages),
    )
    .map((item) => {
      const page = pages.find((candidate) => candidate.source_poster_id === item.id);
      return page ? { ...item, to: pageUrl(page) } : item;
    });
  const items = programmeFeed(events, published);
  if (!items.length && !listing) return null;
  return (
    <section className="community-programme-feed" aria-labelledby="programme-feed-title">
      <header>
        <h2 id="programme-feed-title">What’s on</h2>
        {!listing && isPageVisible(getContent, '/events') && (
          <Link to="/events">
            View all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>
      {!items.length && (
        <p>
          No activities are listed at the moment. Please contact the centre for current details.
        </p>
      )}
      <div className="programme-feed-rows">
        {items.slice(0, listing ? limit : 3).map((item) => {
          const external = safeWebUrl(item.to);
          const internal =
            typeof item.to === 'string' &&
            /^\/(?!\/)/.test(item.to) &&
            isPageVisible(getContent, item.to)
              ? item.to
              : '';
          const image =
            typeof item.image === 'string' &&
            (/^\/(?!\/)/.test(item.image) || safeWebUrl(item.image))
              ? item.image
              : '';
          return (
            <article key={item.id} className="programme-feed-row">
              {image || item.kind === 'announcement' ? (
                <button
                  className="programme-feed-thumb"
                  type="button"
                  onClick={() => setSelected(item)}
                  aria-label={`View ${item.title} ${image ? 'poster' : 'notice'}`}
                >
                  {image ? (
                    <img src={image} alt="" loading="lazy" width="64" height="84" />
                  ) : (
                    <CalendarDays aria-hidden="true" />
                  )}
                </button>
              ) : (
                <span className="programme-feed-thumb">
                  <CalendarDays size={24} aria-hidden="true" />
                </span>
              )}
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.event_date ? (
                    <>
                      <time dateTime={item.event_date}>
                        {new Date(`${item.event_date}T12:00:00`).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </time>
                      {item.start_time && ` · ${displayTime(item.start_time)}`}
                    </>
                  ) : (
                    item.schedule || item.subtitle
                  )}
                </p>
                {item.location && <p>{item.location}</p>}
                {external ? (
                  <a href={external} rel="noreferrer">
                    Details & registration <ArrowRight size={14} aria-hidden="true" />
                  </a>
                ) : internal ? (
                  <Link to={internal}>
                    Programme details <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ) : item.description ? (
                  <details>
                    <summary>Event details</summary>
                    <p>{item.description}</p>
                  </details>
                ) : (
                  <Link to="/contact">Ask about this activity</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {listing && items.length > limit && (
        <button
          className="programme-feed-more"
          type="button"
          onClick={() => setLimit((count) => count + 12)}
        >
          Show more activities
        </button>
      )}
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
    </section>
  );
}
