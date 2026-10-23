import React from 'react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import '@/styles/about.css';

export default function AboutMasthead({
  eyebrow = 'About JIC',
  title,
  children,
  photo = false,
  graphic = false,
  actions,
}) {
  return (
    <header
      className={`about-masthead ${photo ? 'has-photo' : ''} ${graphic ? 'has-graphic' : ''}`}
    >
      <div className="about-masthead-copy">
        <p className="about-eyebrow">{eyebrow}</p>
        {title && <h1>{title}</h1>}
        {children}
        {actions && <div className="about-actions">{actions}</div>}
      </div>
      {photo && (
        <figure className="about-photo">
          <picture>
            <source
              media="(max-width: 700px)"
              srcSet="/optimized/jic-about-480.webp 480w, /optimized/jic-about-760.webp 760w"
              sizes="calc(100vw - 32px)"
            />
            <img
              src="/optimized/jic-about-760.webp"
              srcSet="/optimized/jic-about-760.webp 760w, /optimized/jic-aerial-sunset.webp 1150w"
              sizes="(max-width: 1150px) 48vw, 550px"
              width="1150"
              height="1098"
              alt="Jamatia Islamic Centre on Woodlands Road, with Birmingham beyond"
              decoding="async"
            />
          </picture>
          <figcaption>Woodlands Road · Sparkhill · Birmingham</figcaption>
        </figure>
      )}
      {graphic && (
        <div className="about-brand-graphic" aria-hidden="true">
          <JamatiaLogo variant="entrance" />
        </div>
      )}
    </header>
  );
}
