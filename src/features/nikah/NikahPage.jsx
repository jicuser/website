import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, CalendarDays, Heart, Image as ImageIcon } from 'lucide-react';
import BuiltInForm from '@/components/sections/BuiltInForm';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';
import NikahVenue from './NikahVenue';
import { NIKAH_VENUE_KEY, readNikahVenue } from './venue';
import '@/styles/services.css';
import './nikah.css';

const bookings = [
  { id: 'nikah', label: 'Nikah only', slug: 'nikah-enquiry', title: 'Book a Nikah' },
  { id: 'both', label: 'Nikah & hall', slug: 'nikah-enquiry', title: 'Book a Nikah & hall' },
  { id: 'hall', label: 'Hall only', slug: 'hall-booking', title: 'Book the hall' },
];

export default function NikahPage() {
  const { getContent } = useContent();
  const { hash } = useLocation();
  const venue = readNikahVenue(getContent(NIKAH_VENUE_KEY, null));
  const [selected, setSelected] = useState(hash === '#enquire' ? 'nikah' : '');
  const [opened, setOpened] = useState(hash === '#enquire' ? ['nikah'] : []);
  const heading = useRef(null);
  const focusNext = useRef(false);
  const hasVenue = Object.values(venue).some((area) => area.visible);
  const hallVisible = isPageVisible(getContent, '/services/hall-booking');
  function openBooking(id) {
    focusNext.current = true;
    setSelected(id);
    setOpened((current) => (current.includes(id) ? current : [...current, id]));
    if (selected === id) heading.current?.focus();
  }
  useEffect(() => {
    if (hash === '#enquire') {
      setSelected((current) => current || 'nikah');
      setOpened((current) => (current.includes('nikah') ? current : [...current, 'nikah']));
    }
  }, [hash]);
  useEffect(() => {
    if (focusNext.current) {
      heading.current?.focus();
      focusNext.current = false;
    }
  }, [selected]);
  return (
    <div className="service-page nikah-page">
      <header className="nikah-heading">
        <Link className="guidance-back-link" to="/services">
          Community Hub
        </Link>
        <h1>Nikah at JIC</h1>
        <p>Explore the spaces and arrange your day.</p>
      </header>
      <div className="nikah-actions" aria-label="Nikah and hall bookings">
        <button
          type="button"
          onClick={() => openBooking('nikah')}
          aria-controls="enquire"
          aria-expanded={selected === 'nikah' || selected === 'both'}
        >
          <Heart size={20} aria-hidden="true" />
          <span>Book Nikah</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        {hallVisible && (
          <button
            type="button"
            onClick={() => openBooking('hall')}
            aria-controls="enquire"
            aria-expanded={selected === 'hall'}
          >
            <Building2 size={20} aria-hidden="true" />
            <span>Book hall</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <nav className="nikah-quick-links" aria-label="Venue information">
        {hasVenue && (
          <a href="#facilities">
            <ImageIcon size={17} aria-hidden="true" /> View facilities
          </a>
        )}
        {hallVisible && (
          <Link to="/services/hall-booking">
            <CalendarDays size={17} aria-hidden="true" /> Check hall dates
          </Link>
        )}
      </nav>
      <section
        id="enquire"
        className="service-questions nikah-booking"
        aria-label="Your booking enquiry"
        hidden={!selected}
      >
        <div className="nikah-booking-heading">
          <h2 ref={heading} tabIndex={-1}>
            What would you like to book?
          </h2>
          <button
            type="button"
            className="nikah-close-booking"
            onClick={() => {
              setSelected('');
              document.querySelector('.nikah-actions button')?.focus();
            }}
          >
            Close questions
          </button>
        </div>
        <div className="nikah-booking-options" role="group" aria-label="Booking type">
          {bookings
            .filter((item) => hallVisible || item.id === 'nikah')
            .map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => openBooking(item.id)}
              >
                {item.label}
              </button>
            ))}
        </div>
        <p className="nikah-booking-note">
          The team will confirm availability, costs and arrangements before your booking is agreed.
        </p>
        {bookings
          .filter((item) => opened.includes(item.id))
          .map((item) => (
            <div key={item.id} hidden={selected !== item.id}>
              <BuiltInForm slug={item.slug} bookingType={item.id} title={item.title} />
            </div>
          ))}
      </section>
      <NikahVenue venue={venue} />
      <section className="service-faq nikah-information" aria-label="Nikah information">
        <details>
          <summary>What to prepare</summary>
          <ul>
            {SERVICE_JOURNEYS.nikah.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>The team will confirm the ceremony requirements with you.</p>
        </details>
        {SERVICE_JOURNEYS.nikah.faqs.map(([title, text]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{text}</p>
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
