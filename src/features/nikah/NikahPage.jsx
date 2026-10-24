import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, CalendarDays, Car, CheckCircle2,
  ChevronDown, ClipboardList, Heart, Image as ImageIcon, Sparkles, Users,
} from 'lucide-react';
import BuiltInForm from '@/components/sections/BuiltInForm';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';
import NikahVenue from './NikahVenue';
import { NIKAH_AREAS, NIKAH_VENUE_KEY, readNikahVenue } from './venue';
import '@/styles/services.css';
import './nikah.css';

const bookings = [
  { id: 'nikah', label: 'Nikah only', slug: 'nikah-enquiry', title: 'Book a Nikah' },
  { id: 'both', label: 'Nikah & hall', slug: 'nikah-enquiry', title: 'Book a Nikah & hall' },
  { id: 'hall', label: 'Hall only', slug: 'hall-booking', title: 'Book the hall' },
];

function focusSection(element) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    block: 'start',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

export default function NikahPage() {
  const { getContent } = useContent();
  const { hash } = useLocation();
  const venue = readNikahVenue(getContent(NIKAH_VENUE_KEY, null));
  const [selected, setSelected] = useState(hash === '#enquire' ? 'nikah' : '');
  const [opened, setOpened] = useState(hash === '#enquire' ? ['nikah'] : []);
  const [venueGroup, setVenueGroup] = useState('facilities');
  const [failedHero, setFailedHero] = useState([]);
  const heading = useRef(null);
  const venueHeading = useRef(null);
  const bookingTrigger = useRef(null);
  const firstBookingButton = useRef(null);
  const focusNext = useRef(false);
  const hallVisible = isPageVisible(getContent, '/services/hall-booking');
  const activeBooking = hallVisible || selected === 'nikah' ? selected : '';
  const hasGroup = (group) => NIKAH_AREAS.some((area) => area.group === group && venue[area.id].visible);
  // Only admin-published, visible photographs can become the hero. No stock venue imagery.
  const heroPhoto = ['decorations', 'mens_hall', 'ladies_hall']
    .filter((id) => venue[id].visible)
    .flatMap((id) => venue[id].photos)
    .find((photo) => !failedHero.includes(photo.url));

  function openBooking(id, trigger) {
    if (!hallVisible && id !== 'nikah') return;
    if (trigger) bookingTrigger.current = trigger;
    setOpened((current) => (current.includes(id) ? current : [...current, id]));
    if (selected === id) {
      focusSection(heading.current);
    } else {
      focusNext.current = true;
      setSelected(id);
    }
  }
  function showVenue(group) {
    setVenueGroup(group);
    focusSection(venueHeading.current);
  }
  useEffect(() => {
    if (hash === '#enquire') {
      setSelected((current) => current || 'nikah');
      setOpened((current) => (current.includes('nikah') ? current : [...current, 'nikah']));
    }
  }, [hash]);
  useEffect(() => {
    if (focusNext.current) {
      focusSection(heading.current);
      focusNext.current = false;
    }
  }, [selected]);

  return (
    <div className="service-page nikah-page">
      <div className={`nikah-hero${heroPhoto ? ' nikah-hero--photo' : ''}`}>
        {heroPhoto && (
          <img
            className="nikah-hero-photo"
            src={heroPhoto.url}
            alt=""
            decoding="async"
            onError={() => setFailedHero((current) => [...current, heroPhoto.url])}
          />
        )}
        <header className="nikah-heading">
          <Link className="guidance-back-link" to="/services">
            <ArrowLeft size={14} aria-hidden="true" /> Community Hub
          </Link>
          <h1><span>Nikah</span> at JIC</h1>
          <p>A blessed start to your journey together.<br />Explore our spaces and arrange your day.</p>
        </header>
        <div className="nikah-actions" aria-label="Nikah and hall bookings">
          <button
            ref={firstBookingButton}
            className="nikah-action-primary"
            type="button"
            aria-label="Book Nikah"
            onClick={(event) => openBooking('nikah', event.currentTarget)}
            aria-controls="enquire"
            aria-expanded={activeBooking === 'nikah' || activeBooking === 'both'}
          >
            <Heart size={25} aria-hidden="true" />
            <span className="nikah-action-copy"><strong>Book Nikah</strong><small>Arrange your ceremony</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          {hallVisible && (
            <button
              type="button"
              aria-label="Book hall"
              onClick={(event) => openBooking('hall', event.currentTarget)}
              aria-controls="enquire"
              aria-expanded={activeBooking === 'hall'}
            >
              <Building2 size={25} aria-hidden="true" />
              <span className="nikah-action-copy"><strong>Book hall</strong><small>Bring everyone together</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <nav className="nikah-quick-links" aria-label="Venue information">
        {hasGroup('facilities') && (
          <button type="button" onClick={() => showVenue('facilities')} aria-controls="nikah-venue-content">
            <ImageIcon size={23} aria-hidden="true" /><span>View facilities</span>
          </button>
        )}
        {hallVisible && (
          <Link to="/services/hall-booking">
            <CalendarDays size={23} aria-hidden="true" /><span>Check hall dates</span>
          </Link>
        )}
        {hasGroup('examples') && (
          <button type="button" onClick={() => showVenue('examples')} aria-label="Decorated examples gallery" aria-controls="nikah-venue-content">
            <Sparkles size={23} aria-hidden="true" /><span>Decorated examples</span>
          </button>
        )}
        {hasGroup('parking') && (
          <button type="button" onClick={() => showVenue('parking')} aria-controls="nikah-venue-content">
            <Car size={23} aria-hidden="true" /><span>Parking information</span>
          </button>
        )}
      </nav>
      <section
        id="enquire"
        className="service-questions nikah-booking"
        aria-label="Your booking enquiry"
        hidden={!activeBooking}
      >
        <div className="nikah-booking-heading">
          <h2 ref={heading} tabIndex={-1}>What would you like to book?</h2>
          <button
            type="button"
            className="nikah-close-booking"
            onClick={() => {
              setSelected('');
              (bookingTrigger.current?.isConnected ? bookingTrigger.current : firstBookingButton.current)?.focus();
            }}
          >Close questions</button>
        </div>
        <div className="nikah-booking-options" role="group" aria-label="Booking type">
          {bookings.filter((item) => hallVisible || item.id === 'nikah').map((item) => (
            <button key={item.id} type="button" aria-pressed={activeBooking === item.id}
              onClick={() => openBooking(item.id)}>{item.label}</button>
          ))}
        </div>
        <p className="nikah-booking-note">
          The team will confirm availability, costs and arrangements before your booking is agreed.
        </p>
        {bookings.filter((item) => opened.includes(item.id) && (hallVisible || item.id === 'nikah')).map((item) => (
          <div key={item.id} hidden={activeBooking !== item.id}>
            <BuiltInForm slug={item.slug} bookingType={item.id} title={item.title} />
          </div>
        ))}
      </section>
      <NikahVenue venue={venue} selectedGroup={venueGroup} onGroupChange={setVenueGroup} headingRef={venueHeading} />
      <section className="nikah-planning" aria-labelledby="nikah-planning-title">
        <div className="nikah-planning-heading">
          <div><h2 id="nikah-planning-title">Plan your Nikah</h2><p>A few details to help us arrange your day.</p></div>
          <button type="button" className="nikah-planning-start" aria-controls="enquire" aria-expanded={!!activeBooking}
            onClick={(event) => openBooking(activeBooking || 'nikah', event.currentTarget)}>
            Start planning <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
        <ol className="nikah-planning-steps">
          {[
            [ClipboardList, 'Check requirements'],
            [CalendarDays, 'Choose a date'],
            [Users, hallVisible ? 'Choose your spaces' : 'Share your details'],
            [CheckCircle2, 'Team confirms'],
          ].map(([Icon, label], index) => (
            <li key={label}><span className="nikah-step-icon"><Icon size={21} aria-hidden="true" /><span>{index + 1}</span></span><span>{label}</span></li>
          ))}
        </ol>
      </section>
      <details className="nikah-more-information">
        <summary>
          <span><strong>Need more information?</strong><small>Requirements, arrangements and common questions.</small></span>
          <span className="nikah-details-label">View details <ChevronDown size={17} aria-hidden="true" /></span>
        </summary>
        <section className="service-faq nikah-information" aria-label="Nikah information">
          <details>
            <summary>What to prepare</summary>
            <ul>{SERVICE_JOURNEYS.nikah.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
            <p>The team will confirm the ceremony requirements with you.</p>
          </details>
          {SERVICE_JOURNEYS.nikah.faqs.map(([title, text]) => (
            <details key={title}><summary>{title}</summary><p>{text}</p></details>
          ))}
        </section>
      </details>
      <div className="nikah-additional-content">
        <ManagedPageContent optional headingLevel={2} />
        <ManagedPageSections />
      </div>
    </div>
  );
}
