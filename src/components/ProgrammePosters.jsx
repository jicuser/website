import { OPTIMIZED_IMAGES } from '@/content/optimizedImages';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Expand, Megaphone } from 'lucide-react';
import usePosters from '@/hooks/usePosters';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { pageUrl } from '@/lib/pageContent';
import { posterAppearsOnPage, posterWebsiteLocations } from '@/lib/programmePlacement';
import ImageViewer from '@/components/ImageViewer';
import AnnouncementViewer from '@/components/posters/AnnouncementViewer';

export default function ProgrammePosters({ listing = false }) {
  const { pathname } = useLocation();
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
  const posters = listing ? publicPosters : publicPosters.slice(0, 4);
  if (!posters.length)
    return listing ? (
      <section className="jic-programme-listing" aria-label="Published programmes">
        <p>No programmes are listed at the moment. Contact the centre for the latest details.</p>
        <Link to="/contact">Contact the centre</Link>
      </section>
    ) : null;
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
          <span aria-hidden="true">
            <Expand size={14} />
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
        </section>
      ) : (
        <section className="jic-rail-section jic-programmes" aria-label="Notices and activities">
          <header className="jic-rail-heading">
            <h2>
              {group === 'home'
                ? 'What’s on'
                : ['education', 'madrassah', 'worship'].includes(group)
                  ? 'Classes & gatherings'
                  : 'Notices & activities'}
            </h2>
            <Link className="jic-rail-all" to="/education/programmes">
              View all programmes <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </header>
          <div className="jic-programme-grid">{cards}</div>
        </section>
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
