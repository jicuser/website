import { OPTIMIZED_IMAGES } from '@/content/optimizedImages';
import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Expand, Megaphone } from 'lucide-react';
import usePosters from '@/hooks/usePosters';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { pageUrl } from '@/lib/pageContent';
import { posterAppearsOnPage, posterWebsiteLocations } from '@/lib/programmePlacement';
import ImageViewer from '@/components/ImageViewer';
import SwipeRail from '@/components/SwipeRail';
import AnnouncementViewer from '@/components/posters/AnnouncementViewer';
import { EventRows } from '@/components/home/WhatsOn';

export default function ProgrammePosters({ listing = false, compact = false }) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const programmes = usePosters();
  const pages = usePublishedPages();
  const [selected, setSelected] = useState(null);
  const group = pathname === '/' ? 'home' : pathname.split('/')[1];
  const publicPosters = programmes
    .filter((item) =>
      listing
        ? posterWebsiteLocations(item, pages).length > 0
        : posterAppearsOnPage(item, pathname, pages),
    )
    .map((item) => {
      const page = pages.find((candidate) => candidate.source_poster_id === item.id);
      return page ? { ...item, to: pageUrl(page), registration: page.registration } : item;
    });
  const page = Math.max(
    0,
    Math.min(
      Math.max(0, Math.ceil(publicPosters.length / 6) - 1),
      Number.parseInt(params.get('page') || '1', 10) - 1 || 0,
    ),
  );
  const posters = listing ? publicPosters.slice(page * 6, page * 6 + 6) : publicPosters.slice(0, 4);
  if (!posters.length)
    return listing ? (
      <section className="jic-programme-listing" aria-label="Published programmes">
        <p>No programmes are listed at the moment. Contact the centre for the latest details.</p>
        <Link to="/contact">Contact the centre</Link>
      </section>
    ) : null;
  if (compact)
    return (
      <details className="jic-programmes compact-programme-notices">
        <summary>Notices & programmes</summary>
        <EventRows rows={posters.slice(0, 3)} />
        <Link to="/education/programmes">All programmes & posters</Link>
      </details>
    );
  const cards = posters.map((item) => (
    <article className="jic-programme-card" key={item.id}>
      {item.kind === 'announcement' ? (
        <button
          type="button"
          className="jic-poster-button jic-announcement-button"
          onClick={() => setSelected(item)}
          aria-label={`Read ${item.title} announcement`}
        >
          <Megaphone size={30} aria-hidden="true" />
          <span>Read notice</span>
        </button>
      ) : (
        <button
          type="button"
          className="jic-poster-button"
          onClick={() => setSelected(item)}
          aria-label={`View ${item.title} poster`}
        >
          <img
            src={OPTIMIZED_IMAGES[item.image] || item.image}
            decoding="async"
            alt={item.alt}
            loading="lazy"
            width="1224"
            height="1730"
          />
          <span>
            <Expand size={16} /> View poster
          </span>
        </button>
      )}
      <div className="jic-programme-copy">
        <p className="jic-programme-meta">{item.subtitle}</p>
        <h3>{item.title}</h3>
        <p>{item.schedule}</p>
        <p className="jic-programme-detail">{item.detail}</p>
        <Link to={item.to === pathname ? '/contact' : item.to}>
          {item.registration && item.registration !== 'none'
            ? 'Details & registration'
            : item.to === pathname
              ? 'Enquire at the centre'
              : 'Explore programme'}{' '}
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  ));
  return (
    <>
      {listing ? (
        <section className="jic-programme-listing" aria-label="Published programmes">
          <div className="jic-programme-grid">{cards}</div>
          {publicPosters.length > 6 && (
            <nav className="compact-pagination" aria-label="Programme pages">
              <button
                type="button"
                disabled={!page}
                onClick={() => setParams({ page: String(page) })}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(publicPosters.length / 6)}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 6 >= publicPosters.length}
                onClick={() => setParams({ page: String(page + 2) })}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      ) : (
        <SwipeRail
          title={
            group === 'home'
              ? 'What’s on'
              : ['education', 'madrassah', 'worship'].includes(group)
                ? 'Classes & gatherings'
                : 'Notices & activities'
          }
          className="jic-programmes"
          action={
            <Link className="jic-rail-all" to="/education/programmes">
              View all programmes <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        >
          {cards}
        </SwipeRail>
      )}
      {selected?.kind === 'announcement' ? (
        <AnnouncementViewer poster={selected} onClose={() => setSelected(null)} />
      ) : selected ? (
        <ImageViewer
          image={{ title: selected.title, url: selected.image, alt: selected.alt }}
          onClose={() => setSelected(null)}
        >
          <p>Pinch to zoom, or open the full-size poster to save it.</p>
          <a href={selected.image} target="_blank" rel="noopener noreferrer">
            Open full-size poster
          </a>
          <a href={selected.image} download={selected.image.split('/').pop()}>
            Download poster
          </a>
        </ImageViewer>
      ) : null}
    </>
  );
}
