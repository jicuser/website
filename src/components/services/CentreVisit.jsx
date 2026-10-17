import React, { useState } from 'react';
import { MapPin, Navigation, Phone } from 'lucide-react';
import { SITE } from '@/content/site';

export default function CentreVisit() {
  const [showMap, setShowMap] = useState(false);
  const query = encodeURIComponent(`${SITE.name}, ${SITE.address.full}`);
  return (
    <section className="service-visit" aria-labelledby="service-visit-title">
      <div>
        <p className="service-eyebrow">
          <MapPin size={16} aria-hidden="true" /> Find us
        </p>
        <h2 id="service-visit-title">Visit the centre</h2>
        <p>
          {SITE.address.line1}
          <br />
          {SITE.address.line2}
        </p>
        <p>
          Contact the office before a service appointment to confirm the time and any access needs.
        </p>
        <div className="service-actions">
          <a
            className="service-button"
            href={`https://www.google.com/maps/dir/?api=1&destination=${query}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation size={17} aria-hidden="true" /> Get directions
          </a>
          <a className="service-text-link" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
            <Phone size={16} aria-hidden="true" /> {SITE.phone}
          </a>
        </div>
      </div>
      <div className="service-map">
        {showMap ? (
          <iframe
            title="Map of Jamatia Islamic Centre"
            src={`https://maps.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <>
            <MapPin size={32} aria-hidden="true" />
            <strong>Woodlands Road · Sparkhill</strong>
            <span>Birmingham B11 4ER</span>
            <button type="button" className="service-button" onClick={() => setShowMap(true)}>
              Show location map
            </button>
            <small>Loads Google Maps</small>
          </>
        )}
      </div>
    </section>
  );
}
