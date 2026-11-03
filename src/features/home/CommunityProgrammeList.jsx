import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
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
import { programmePageIndex, programmePageSize } from './programmePaging';
import './programme-feed.css';

export default function CommunityProgrammeList({ events = [], listing = false, placementPath = '/', compact = false }) {
  const rail = useRef(null);
  const [page, setPage] = useState(0);
  const posters = usePosters();
  const pages = usePublishedPages();
  const { getContent } = useContent();
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(12);
  const isCompact = compact && !listing;
  const published = posters
    .filter((item) => listing ? posterWebsiteLocations(item, pages).length > 0 : posterAppearsOnPage(item, placementPath, pages))
    .map((item) => {
      const page = pages.find((candidate) => candidate.source_poster_id === item.id);
      return page ? { ...item, to: pageUrl(page) } : item;
    });
  const items = programmeFeed(events, published);
  const rowsPerPage = programmePageSize(compact, listing);
  const pagesCount = Math.ceil(items.length / rowsPerPage);
  useEffect(() => {
    const element = rail.current;
    if (!element || listing) return undefined;
    // Restart the horizontal rail when its geometry changes; no vertical page scroll.
    const reset = () => { element.scrollLeft = 0; setPage(0); };
    reset();
    const observer = new ResizeObserver(reset);
    observer.observe(element);
    return () => observer.disconnect();
  }, [rowsPerPage, pagesCount, listing]);
  function move(direction) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  const controls = !listing && pagesCount > 1 ? (
    <nav className="programme-feed-controls" aria-label="Browse activities">
      <button type="button" aria-label="Previous activities" disabled={page === 0} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
      <span aria-live="polite">{Math.min(page + 1, pagesCount)} / {pagesCount}</span>
      <button type="button" aria-label="Next activities" disabled={page >= pagesCount - 1} onClick={() => move(1)}><ArrowRight size={18} /></button>
    </nav>
  ) : null;
  if (!items.length && !listing) return null;
  return (
    <section className={`community-programme-feed${isCompact ? ' is-bookmark-compact' : ''}`} aria-labelledby="programme-feed-title">
      <header>
        <h2 id="programme-feed-title">What’s on</h2>
        {isCompact && controls}
        {!listing && isPageVisible(getContent, '/events') && <Link to="/events">View all <ArrowRight size={16} aria-hidden="true" /></Link>}
      </header>
      {!items.length && <p>No activities are listed at the moment. Please contact the centre for current details.</p>}
      {!isCompact && controls}
      <div ref={rail} className={`programme-feed-rows ${listing ? '' : 'programme-feed-carousel'}`}
        style={isCompact ? { gridTemplateRows: `repeat(${rowsPerPage}, auto)` } : undefined}
        onScroll={listing ? undefined : () => setPage(programmePageIndex(rail.current.scrollLeft, rail.current.clientWidth, pagesCount))}>
        {items.slice(0, listing ? limit : undefined).map((item) => {
          const external = safeWebUrl(item.to);
          const internal = typeof item.to === 'string' && /^\/(?!\/)/.test(item.to) && isPageVisible(getContent, item.to) ? item.to : '';
          const image = typeof item.image === 'string' && (/^\/(?!\/)/.test(item.image) || safeWebUrl(item.image)) ? item.image : '';
          const schedule = item.event_date ? <><time dateTime={item.event_date}>{new Date(`${item.event_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</time>{item.start_time && ` · ${displayTime(item.start_time)}`}</> : item.schedule || item.subtitle;
          const compactCopy = <span className="programme-compact-copy"><strong>{item.title}</strong><span>{schedule}{item.location && <> · {item.location}</>}</span></span>;
          return (
            <article key={item.id} className="programme-feed-row">
              {image || item.kind === 'announcement' ? (
                <button className="programme-feed-thumb" type="button" onClick={() => setSelected(item)} aria-label={`View ${item.title} ${image ? 'poster' : 'notice'}`}>
                  {image ? <img src={image} alt="" loading="lazy" width="64" height="84" /> : <CalendarDays aria-hidden="true" />}
                </button>
              ) : <span className="programme-feed-thumb"><CalendarDays size={24} aria-hidden="true" /></span>}
              {isCompact ? (
                external ? <a className="programme-compact-link" href={external} rel="noreferrer">{compactCopy}<ArrowRight size={16} aria-hidden="true" /></a>
                  : internal ? <Link className="programme-compact-link" to={internal}>{compactCopy}<ArrowRight size={16} aria-hidden="true" /></Link>
                    : item.description ? <details className="programme-compact-details"><summary>{compactCopy}</summary><p>{item.description}</p></details>
                      : <Link className="programme-compact-link" to="/contact">{compactCopy}<ArrowRight size={16} aria-hidden="true" /></Link>
              ) : (
                <div>
                  <h3>{item.title}</h3><p>{schedule}</p>{item.location && <p>{item.location}</p>}
                  {external ? <a href={external} rel="noreferrer">Details & registration <ArrowRight size={14} aria-hidden="true" /></a>
                    : internal ? <Link to={internal}>Programme details <ArrowRight size={14} aria-hidden="true" /></Link>
                      : item.description ? <details><summary>Event details</summary><p>{item.description}</p></details>
                        : <Link to="/contact">Ask about this activity</Link>}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {listing && items.length > limit && <button className="programme-feed-more" type="button" onClick={() => setLimit((count) => count + 12)}>Show more activities</button>}
      {selected?.kind === 'announcement' ? <AnnouncementViewer poster={selected} onClose={() => setSelected(null)} /> : selected && (
        <ImageViewer image={{ title: selected.title, url: selected.image, alt: selected.alt || selected.title }} onClose={() => setSelected(null)}>
          <a href={selected.image} target="_blank" rel="noreferrer">Open full-size poster</a>
        </ImageViewer>
      )}
    </section>
  );
}
