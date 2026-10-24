import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Phone } from 'lucide-react';
import { SITE } from '@/content/site';
import ManagedPageContent from '@/components/ManagedPageContent';
import ContactForm from '@/components/sections/contact/ContactForm';
import BuiltInForm from '@/components/sections/BuiltInForm';
import { serviceEnquiry } from '@/lib/serviceEnquiries';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
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
  const enquiry = serviceEnquiry(journey.formSlug);
  const { pathname, hash } = useLocation();
  const { getContent } = useContent();
  const tabs = [
    ['how-it-works', 'The steps'],
    ['prepare', 'What to prepare'],
    ['questions', 'Questions'],
    ['enquire', 'Make an enquiry'],
  ];
  const selected = tabs.some(([id]) => `#${id}` === hash) ? hash.slice(1) : 'how-it-works';
  const guideId =
    journey.guideId ||
    (journey.formSlug === 'funeral-enquiry'
      ? 'funeral'
      : journey.formSlug === 'nikah-enquiry'
        ? 'nikah'
        : 'volunteer');
  return (
    <div className="service-page service-page--guided">
      <header className="service-guided-heading">
        <Link className="guidance-back-link" to="/services">
          Community Hub
        </Link>
        <ManagedPageContent fallbackTitle={journey.title} fallbackBody={journey.intro} />
        <div className="service-actions">
          <a className="service-text-link" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
            <Phone size={17} aria-hidden="true" /> Call the office · {SITE.phone}
          </a>
          {selected !== 'enquire' && (
            <Link className="service-text-link" to={`${pathname}#enquire`}>
              {journey.action}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
        {guideId === 'funeral' && (
          <p className="service-small">
            For time-sensitive arrangements, call the office directly. You do not need to complete a
            guide or form.
          </p>
        )}
      </header>
      {selected === 'how-it-works' && <GuidancePanel journeyId={guideId} />}
      <nav className="service-jump-links" aria-label="On this page">
        {tabs.map(([id, title]) => (
          <Link
            key={id}
            to={`${pathname}#${id}`}
            aria-current={selected === id ? 'location' : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      {selected === 'how-it-works' && (
        <section id="how-it-works" className="service-section">
          <h2>How it works</h2>
          <JourneySteps steps={journey.steps} />
        </section>
      )}
      {selected === 'prepare' && (
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
      )}
      {selected === 'questions' && (
        <section id="questions" className="service-faq">
          <h2>Your questions</h2>
          {journey.faqs.map(([title, text]) => (
            <details key={title}>
              <summary>{title}</summary>
              <p>{text}</p>
            </details>
          ))}
        </section>
      )}
      {selected === 'enquire' && (
        <section id="enquire" className="service-enquiry">
          <div>
            <h2>{journey.action}</h2>
            <p>
              {enquiry?.slug === 'funeral-enquiry'
                ? 'For urgent funeral support, call '
                : 'For a time-sensitive enquiry, call '}
              <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a>.
              {enquiry?.slug === 'funeral-enquiry' && ' This inbox is not an emergency service.'}
            </p>
            <p className="service-small">
              No account is needed. Please avoid sending identity documents or payment details in
              this message.
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
      )}
      <section className="service-related" aria-label="Related services">
        {journey.related
          .filter((item) => isPageVisible(getContent, item.to))
          .map((item) => (
            <Link key={item.to} to={item.to}>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
      </section>
    </div>
  );
}
