import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Car,
  Clock,
  Heart,
  Phone,
  Snowflake,
  Truck,
  Droplets,
} from 'lucide-react';
import ManagedPageContent from '@/components/ManagedPageContent';
import BuiltInForm from '@/components/sections/BuiltInForm';
import { useContent } from '@/context/ContentContext';
import { SITE } from '@/content/site';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';
import { isPageVisible } from '@/lib/pageVisibility';
import { FUNERAL_FACILITIES_KEY, readFuneralFacilities } from './facilities';
import '@/styles/services.css';
import '@/styles/funerals.css';

const icons = {
  ambulance: Truck,
  hearse: Car,
  washing: Droplets,
  'cold-room': Snowflake,
  'family-room': Heart,
};

function FacilityCard({ facility }) {
  const [failed, setFailed] = useState(false);
  const Icon = icons[facility.id];
  useEffect(() => setFailed(false), [facility.image]);
  return (
    <article className="funeral-facility">
      <div className="funeral-facility-media">
        {facility.image && !failed ? (
          <img
            src={facility.image}
            alt={facility.alt || facility.title}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <Icon size={36} strokeWidth={1.25} aria-hidden="true" />
        )}
      </div>
      <div className="funeral-facility-copy">
        <h3>{facility.title}</h3>
        <p>{facility.description}</p>
      </div>
    </article>
  );
}

export default function FuneralPage() {
  const { pathname, hash } = useLocation();
  const { getContent } = useContent();
  const section = useRef(null);
  const enquiry =
    hash === '#enquire' || (!hash && pathname.replace(/\/$/, '') === '/funerals/contact-support');
  const selected = enquiry
    ? 'enquire'
    : ['#prepare', '#questions'].includes(hash)
      ? hash.slice(1)
      : 'facilities';
  const facilities = readFuneralFacilities(getContent(FUNERAL_FACILITIES_KEY, '[]')).filter(
    (item) => item.visible,
  );
  const journey = SERVICE_JOURNEYS.funeral;
  useEffect(() => {
    if (hash) section.current?.focus({ preventScroll: true });
  }, [hash]);

  return (
    <div className="service-page funeral-page">
      <header className="funeral-heading">
        <Link className="guidance-back-link" to="/services">
          Community Hub
        </Link>
        <ManagedPageContent
          pagePath="/funerals"
          fallbackTitle="Janazah & funeral support"
          fallbackBody="Here to help with funeral arrangements and care for your loved one."
        />
        <div className="funeral-actions">
          <Link className="service-button is-primary" to="/funerals#enquire">
            Arrange a funeral <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <a className="service-button funeral-call" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
            <Phone size={18} aria-hidden="true" />
            <span>
              Call us<small>{SITE.phone}</small>
            </span>
          </a>
        </div>
        <p className="funeral-contact-note">For urgent arrangements, please call us.</p>
      </header>

      <nav className="funeral-shortcuts" aria-label="Janazah information">
        <Link
          to="/funerals#facilities"
          aria-current={selected === 'facilities' ? 'location' : undefined}
        >
          <Building2 size={22} aria-hidden="true" />
          <span>View facilities</span>
        </Link>
        {isPageVisible(getContent, '/prayer-times') && (
          <Link to="/prayer-times">
            <Clock size={22} aria-hidden="true" />
            <span>Prayer times</span>
          </Link>
        )}
        {isPageVisible(getContent, '/worship/janazah-guide') && (
          <Link to="/worship/janazah-guide">
            <BookOpen size={22} aria-hidden="true" />
            <span>Janazah prayer guide</span>
          </Link>
        )}
      </nav>

      <section
        ref={section}
        tabIndex={-1}
        id={selected}
        className="funeral-content"
        aria-label={enquiry ? 'Funeral arrangements' : 'Funeral information'}
      >
        {enquiry ? (
          <>
            <Link className="service-text-link" to="/funerals#facilities">
              <ArrowLeft size={16} aria-hidden="true" /> Back to facilities
            </Link>
            <h2>Funeral arrangements</h2>
            <p>Our team will contact you to confirm availability, costs and arrangements.</p>
            <BuiltInForm slug="funeral-enquiry" />
          </>
        ) : selected === 'prepare' ? (
          <>
            <h2>Helpful details to have ready</h2>
            <ul className="funeral-checklist">
              {journey.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{journey.note}</p>
          </>
        ) : selected === 'questions' ? (
          <div className="service-faq">
            <h2>Your questions</h2>
            {journey.faqs.map(([title, body]) => (
              <details key={title}>
                <summary>{title}</summary>
                <p>{body}</p>
              </details>
            ))}
          </div>
        ) : (
          <>
            <div className="funeral-section-heading">
              <h2>Facilities & transport</h2>
              <p>Speak to our team about availability and arrangements.</p>
            </div>
            <div className="funeral-facilities">
              {facilities.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} />
              ))}
            </div>
            {!facilities.length && <p>Please call us to discuss the facilities you need.</p>}
          </>
        )}
      </section>
    </div>
  );
}
