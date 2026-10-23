import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Phone } from 'lucide-react';
import { SITE } from '@/content/site';
import ManagedPageContent from '@/components/ManagedPageContent';
import ContactForm from '@/components/sections/contact/ContactForm';
import BuiltInForm from '@/components/sections/BuiltInForm';
import { serviceEnquiryForPath } from '@/lib/serviceEnquiries';
import CentreVisit from './CentreVisit';
import '@/styles/services.css';

export function JourneySteps({ steps, label = 'How it works' }) {
  return (
    <ol className="service-steps" aria-label={label}>
      {steps.map(([title, text], index) => (
        <li key={title}>
          <span className="service-step-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3>{title}</h3>
          <p>{text}</p>
        </li>
      ))}
    </ol>
  );
}

export default function ServiceJourney({ journey }) {
  const { pathname } = useLocation();
  const enquiry = serviceEnquiryForPath(pathname);
  return (
    <div className="service-page">
      <section className="service-hero">
        <div className="service-hero-copy">
          <p className="service-eyebrow">{journey.eyebrow}</p>
          <ManagedPageContent fallbackTitle={journey.title} fallbackBody={journey.intro} />
          <div className="service-actions">
            <a className="service-button is-primary" href="#enquire">
              {journey.action}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="service-text-link" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
              <Phone size={17} aria-hidden="true" /> Call the office
            </a>
          </div>
        </div>
        <figure className="service-centre-photo">
          <img
            src="/optimized/jic-aerial-sunset.webp"
            alt="Jamatia Islamic Centre and the surrounding Sparkhill neighbourhood"
            width="1280"
            height="720"
          />
          <figcaption>Jamatia Islamic Centre · Woodlands Road</figcaption>
        </figure>
      </section>
      <nav className="service-jump-links" aria-label="On this page">
        <a href="#how-it-works">The steps</a>
        <a href="#prepare">What to prepare</a>
        <a href="#questions">Questions</a>
        <a href="#enquire">Make an enquiry</a>
      </nav>
      <section id="how-it-works" className="service-section">
        <p className="service-eyebrow">A clear way forward</p>
        <h2>How it works</h2>
        <JourneySteps steps={journey.steps} />
      </section>
      <div className="service-detail-grid">
        <section id="prepare" className="service-checklist">
          <h2>Helpful details to have ready</h2>
          <ul>
            {journey.checklist.map((item) => (
              <li key={item}>
                <Check size={18} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>{journey.note}</p>
        </section>
        <section id="questions" className="service-faq">
          <h2>Your questions</h2>
          {journey.faqs.map(([title, text]) => (
            <details key={title}>
              <summary>{title}</summary>
              <p>{text}</p>
            </details>
          ))}
        </section>
      </div>
      <section id="enquire" className="service-enquiry">
        <div>
          <p className="service-eyebrow">Your next step</p>
          <h2>{journey.action}</h2>
          <p>
            {enquiry?.slug === 'funeral-enquiry'
              ? 'For urgent funeral support, call '
              : 'For a time-sensitive enquiry, call '}
            <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a>.
            {enquiry?.slug === 'funeral-enquiry' && ' This inbox is not an emergency service.'}
          </p>
          <p className="service-small">
            No account is needed. Please avoid sending identity documents or payment details in this
            message.
          </p>
        </div>
        <div className="service-enquiry-form">
          {enquiry ? (
            <BuiltInForm slug={enquiry.slug} />
          ) : (
            <ContactForm subject={journey.subject} title="Your enquiry" />
          )}
        </div>
      </section>
      <CentreVisit />
      <section className="service-related" aria-label="Related services">
        {journey.related.map((item) => (
          <Link key={item.to} to={item.to}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        ))}
      </section>
    </div>
  );
}
