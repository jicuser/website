import React, { lazy } from 'react';
import { ExternalLink, Mail, Phone } from 'lucide-react';
import AboutDetails from './AboutDetails';
import { SITE } from '@/content/site';

const ContactFormSection = lazy(() => import('@/components/sections/contact/ContactFormSection'));

export default function ContactSection() {
  const query = encodeURIComponent(`${SITE.name}, ${SITE.address.line1}, ${SITE.address.line2}`);
  return (
    <>
      <div className="about-section-intro">
        <p className="about-eyebrow">Come and meet us</p>
        <h2>You’re always welcome.</h2>
      </div>
      <div className="about-visit-details">
        <address>
          {SITE.address.line1}
          <br />
          {SITE.address.line2}
        </address>
        <div className="about-visit-links">
          <a href={`tel:${SITE.phone.replace(/\s+/g, '')}`}>
            <Phone size={17} aria-hidden="true" />
            {SITE.phone}
          </a>
          <a href={`mailto:${SITE.email}`}>
            <Mail size={17} aria-hidden="true" />
            {SITE.email}
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${query}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
      <AboutDetails label="Send an enquiry & find us" anchors={['contact', 'map']}>
        <ContactFormSection />
      </AboutDetails>
    </>
  );
}
