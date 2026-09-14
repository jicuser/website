import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Expand } from 'lucide-react';
import usePosters from '@/hooks/usePosters';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { pageUrl } from '@/lib/pageContent';
import ImageViewer from '@/components/ImageViewer';
import SwipeRail from '@/components/SwipeRail';
import AnnouncementPoster from '@/components/posters/AnnouncementPoster';

export default function ProgrammePosters() {
  const { pathname } = useLocation();
  const programmes = usePosters();
  const pages = usePublishedPages();
  const [selected, setSelected] = useState(null);
  const group = pathname === '/' ? 'home' : pathname.split('/')[1];
  const posters = programmes.filter((item) => {
    if (pathname === '/education/courses') return pages.some(page => page.source_poster_id === item.id && page.placement === pathname);
    return item.groups.includes(group);
  }).map(item => {
    const page = pages.find(candidate => candidate.source_poster_id === item.id);
    return page ? { ...item, to: pageUrl(page), registration: page.registration } : item;
  });
  if (!posters.length) return null;
  return (
    <>
      <SwipeRail
        title={group === 'home' ? 'What’s on & learning' : 'Classes & gatherings'}
        className="jic-programmes"
      >
        {posters.map((item) => (
          <article className="jic-programme-card" key={item.id}>
            {item.kind === 'announcement' ? (
              <div className="poster-announcement-preview">
                <AnnouncementPoster poster={item} />
              </div>
            ) : (
              <button
                type="button"
                className="jic-poster-button"
                onClick={() => setSelected(item)}
                aria-label={`View ${item.title} poster`}
              >
                <img src={item.image} alt={item.alt} loading="lazy" width="1224" height="1730" />
                <span>
                  <Expand size={16} /> View poster
                </span>
              </button>
            )}
            <div className="jic-programme-copy">
              <p className="jic-programme-meta">{item.subtitle}</p>
              <h3>{item.title}</h3>
              <p>{item.schedule}</p>
              <p>{item.detail}</p>
              <Link to={item.to === pathname ? '/contact' : item.to}>
                {item.registration && item.registration !== 'none' ? 'Details & registration' : item.to === pathname ? 'Enquire at the centre' : 'Explore programme'}{' '}
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </SwipeRail>
      {selected && (
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
      )}
    </>
  );
}
