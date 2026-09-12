import React, { useState } from 'react';
import '@/styles/posters.css';

export default function AnnouncementPoster({ poster }) {
  const [failed, setFailed] = useState([]);
  const pictures = (poster.images || []).filter((url) => !failed.includes(url));
  return (
    <article className="announcement-poster" aria-label={poster.title}>
      <div
        className="announcement-poster-content"
        data-density={poster.body.length > 450 || pictures.length ? 'compact' : 'regular'}
      >
        <header>
          <small>Jamatia Islamic Centre</small>
          <h3>{poster.title}</h3>
        </header>
        <div className="announcement-poster-body" dir="auto">
          {poster.body
            .split(/\n\s*\n|\n/)
            .filter((line) => line.trim())
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
        </div>
        {pictures.length > 0 && (
          <div className="announcement-poster-pictures">
            {pictures.map((url) => (
              <img
                key={url}
                src={url}
                alt="Announcement picture"
                onError={() => setFailed((previous) => [...previous, url])}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
