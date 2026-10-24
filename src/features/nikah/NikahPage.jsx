import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight, Building2, CalendarDays, ChevronDown, ChevronRight,
  HelpCircle, Image as ImageIcon,
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

function WeddingRings() {
  return (
    <svg className="nikah-rings" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="23" cy="40" r="17" stroke="currentColor" strokeWidth="3" />
      <circle cx="41" cy="40" r="17" stroke="currentColor" strokeWidth="3" />
      <path d="m26 13 6 6 6-6c4-5-3-10-6-5-3-5-10 0-6 5Z" fill="currentColor" />
    </svg>
  );
}

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
  const bookingLink = hash === '#enquire' || hash === '#book';
  const venue = readNikahVenue(getContent(NIKAH_VENUE_KEY, null));
  const [selected, setSelected] = useState(bookingLink ? 'nikah' : '');
  const [opened, setOpened] = useState(bookingLink ? ['nikah'] : []);
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
    if (bookingLink) {
      setSelected((current) => current || 'nikah');
      setOpened((current) => (current.includes('nikah') ? current : [...current, 'nikah']));
    }
  }, [bookingLink]);
  useEffect(() => {
    if (focusNext.current) {
      focusSection(heading.current);
      focusNext.current = false;
    }
  }, [selected]);

  return (
    <div className="service-page nikah-page nikah-reference">
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
            Community Hub
          </Link>
          <h1>Nikah at JIC</h1>
          <p>Explore the spaces and arrange your day.</p>
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
            <WeddingRings />
            <span className="nikah-action-copy"><strong>Book Nikah</strong><small>Make a booking for your special day.</small></span>
            <span className="nikah-round-arrow"><ArrowRight size={18} aria-hidden="true" /></span>
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
              <span className="nikah-action-copy"><strong>Book hall</strong><small>Find and book a suitable hall.</small></span>
              <span className="nikah-round-arrow"><ArrowRight size={18} aria-hidden="true" /></span>
            </button>
          )}
        </div>
      </div>
      <nav className="nikah-quick-links" aria-label="Venue information">
        {hasGroup('facilities') && (
          <button type="button" onClick={() => showVenue('facilities')} aria-controls="nikah-venue-content">
            <ImageIcon size={20} aria-hidden="true" /><span>View facilities</span><ChevronRight size={17} aria-hidden="true" />
          </button>
        )}
        {hallVisible && (
          <Link to="/services/hall-booking">
            <CalendarDays size={20} aria-hidden="true" /><span>Check hall dates</span><ChevronRight size={17} aria-hidden="true" />
          </Link>
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
      <section className="service-faq nikah-information" aria-labelledby="nikah-faq-title">
        <h2 id="nikah-faq-title">Frequently asked questions</h2>
        <details>
          <summary>
            <HelpCircle size={21} aria-hidden="true" /><span>What to prepare</span>
            <ChevronDown className="nikah-faq-chevron" size={19} aria-hidden="true" />
          </summary>
          <div className="nikah-faq-answer">
            <ul>{SERVICE_JOURNEYS.nikah.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
            <p>The team will confirm the ceremony requirements with you.</p>
          </div>
        </details>
        {SERVICE_JOURNEYS.nikah.faqs.map(([title, text]) => (
          <details key={title}>
            <summary>
              <HelpCircle size={21} aria-hidden="true" /><span>{title}</span>
              <ChevronDown className="nikah-faq-chevron" size={19} aria-hidden="true" />
            </summary>
            <div className="nikah-faq-answer"><p>{text}</p></div>
          </details>
        ))}
      </section>
      <div className="nikah-additional-content">
        <ManagedPageContent optional headingLevel={2} />
        <ManagedPageSections />
      </div>
    </div>
  );
}
