import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Car,
  ChevronRight,
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
  'prayer-hall': Building2,
  'family-room': Heart,
};

function FacilityCard({ facility }) {
  const [failed, setFailed] = useState(false);
  const Icon = icons[facility.id] || Building2;
  useEffect(() => setFailed(false), [facility.image]);
  return (
    <article className="funeral-facility">
      <Link
        className="funeral-facility-link"
        to="/funerals#enquire"
        aria-label={`Enquire about ${facility.title}`}
      >
        <div className="funeral-facility-media">
          {facility.image && !failed ? (
            <img
              src={facility.image}
              alt={facility.alt || facility.title}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            <Icon size={36} strokeWidth={1.25} aria-hidden="true" />
          )}
        </div>
        <div className="funeral-facility-copy">
          <span className="funeral-facility-icon">
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <h3>{facility.title}</h3>
            <p>{facility.description}</p>
          </div>
          <ChevronRight className="funeral-facility-arrow" size={17} aria-hidden="true" />
        </div>
      </Link>
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
      <nav className="funeral-breadcrumb" aria-label="Breadcrumb">
        <Link to="/services">Community Hub</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">Funeral Services</span>
      </nav>
      <header className="funeral-heading">
        <ManagedPageContent
          pagePath="/funerals"
          fallbackTitle="Funeral Services"
          fallbackBody="Supporting you with funeral arrangements and care for your loved one."
        />
        <div className="funeral-actions">
          <a
            className="service-button funeral-call is-primary"
            href={`tel:${SITE.phone.replace(/\s/g, '')}`}
          >
            <Phone size={23} aria-hidden="true" />
            <span>
              Call us<small>{SITE.phone}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </a>
          <Link className="service-button funeral-arrange" to="/funerals#enquire">
            <CalendarDays size={23} aria-hidden="true" />
            <span>
              Arrange a funeral<small>Tell us what you need</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <p className="funeral-contact-note">For urgent arrangements, please call us.</p>
      </header>

      <nav className="funeral-shortcuts" aria-label="Janazah information">
        <Link
          to="/funerals#facilities"
          aria-current={selected === 'facilities' ? 'location' : undefined}
        >
          <Building2 size={23} aria-hidden="true" />
          <span>View facilities<small>Spaces & transport</small></span>
          <ChevronRight className="funeral-shortcut-arrow" size={16} aria-hidden="true" />
        </Link>
        {isPageVisible(getContent, '/prayer-times') && (
          <Link to="/prayer-times">
            <Clock size={23} aria-hidden="true" />
            <span>Prayer times<small>Today’s salah</small></span>
            <ChevronRight className="funeral-shortcut-arrow" size={16} aria-hidden="true" />
          </Link>
        )}
        {isPageVisible(getContent, '/worship/janazah-guide') && (
          <Link to="/worship/janazah-guide">
            <BookOpen size={23} aria-hidden="true" />
            <span>Janazah guide<small>Prayer guidance</small></span>
            <ChevronRight className="funeral-shortcut-arrow" size={16} aria-hidden="true" />
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
              <h2>Our facilities & services</h2>
              <p>Care, preparation and transport. Our team will confirm availability.</p>
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
      <nav className="funeral-next-steps" aria-label="Funeral support">
        <Link to="/funerals#enquire" aria-current={selected === 'enquire' ? 'location' : undefined}>
          <CalendarDays size={19} aria-hidden="true" />
          <span>Book a service</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link to="/funerals#prepare" aria-current={selected === 'prepare' ? 'location' : undefined}>
          <BookOpen size={19} aria-hidden="true" />
          <span>What to prepare</span>
        </Link>
        <Link to="/funerals#questions" aria-current={selected === 'questions' ? 'location' : undefined}>
          <Heart size={19} aria-hidden="true" />
          <span>Your questions</span>
        </Link>
      </nav>
    </div>
  );
}
