import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { SITE } from '@/content/site';
import ManagedPageContent from '@/components/ManagedPageContent';
import ContactForm from '@/components/sections/contact/ContactForm';
import BuiltInForm from '@/components/sections/BuiltInForm';
import { serviceEnquiry } from '@/lib/serviceEnquiries';
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
  const { getContent } = useContent();
  return (
    <div className="service-page service-page--questions">
      <header className="service-guided-heading">
        <Link className="guidance-back-link" to="/services">
          Community Hub
        </Link>
        <ManagedPageContent fallbackTitle={journey.title} fallbackBody={journey.intro} />
        <a className="service-text-link" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
          <Phone size={17} aria-hidden="true" />
          {journey.formSlug === 'funeral-enquiry'
            ? 'For urgent arrangements, call '
            : 'Call the office · '}
          {SITE.phone}
        </a>
      </header>
      <section id="enquire" className="service-questions" aria-label={journey.title}>
        {enquiry ? (
          <BuiltInForm slug={enquiry.slug} />
        ) : (
          <ContactForm subject={journey.subject} title="How can we help?" />
        )}
      </section>
      <section className="service-faq service-information" aria-label="Useful information">
        <details id="how-it-works">
          <summary>How it works</summary>
          <JourneySteps steps={journey.steps} />
        </details>
        <details id="prepare">
          <summary>What to prepare</summary>
          <ul>
            {journey.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{journey.note}</p>
        </details>
        {journey.faqs.map(([title, text]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{text}</p>
          </details>
        ))}
      </section>
      <nav className="service-related" aria-label="Related services">
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
      </nav>
    </div>
  );
}
