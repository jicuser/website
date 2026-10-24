import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Phone, HelpCircle, ListChecks, MessageCircle } from 'lucide-react';
import { SITE } from '@/content/site';
import ManagedPageContent from '@/components/ManagedPageContent';
import ContactForm from '@/components/sections/contact/ContactForm';
import BuiltInForm from '@/components/sections/BuiltInForm';
import { serviceEnquiry } from '@/lib/serviceEnquiries';
import { useContent } from '@/context/ContentContext';
import { pageKey } from '@/content/editablePages';
import { guidanceQuestions } from '@/lib/serviceGuidance';
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
  const enquiry = serviceEnquiry(journey.formSlug);
  const { pathname, hash } = useLocation();
  const { getContent } = useContent();
  const [topic, setTopic] = useState(hash === '#enquire' ? 'contact' : 'start');
  const [contactOpened, setContactOpened] = useState(hash === '#enquire');
  const result = useRef(null);
  let saved = {};
  try {
    saved = JSON.parse(getContent(pageKey(pathname), '{}')) || {};
  } catch {}
  const questions = guidanceQuestions(saved.guidance, journey.faqs);
  const answer = questions[Number(topic)];
  function choose(value) {
    setTopic(value);
    if (value === 'contact') setContactOpened(true);
    requestAnimationFrame(() => {
      result.current?.scrollIntoView({ block: 'nearest' });
      result.current?.focus({ preventScroll: true });
    });
  }
  return (
    <div className="service-page service-guided-page">
      <header className="service-guided-heading">
        <div>
          <p className="service-eyebrow">{journey.eyebrow}</p>
          <ManagedPageContent fallbackTitle={journey.title} fallbackBody={journey.intro} />
        </div>
        <a className="service-text-link" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
          <Phone size={17} aria-hidden="true" />
          Call the office
        </a>
      </header>
      {enquiry?.slug === 'funeral-enquiry' && (
        <p className="service-urgent">
          For urgent funeral support, call{' '}
          <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a>. This inbox is not an
          emergency service.
        </p>
      )}
      <h2 className="service-guide-title">What do you need help with?</h2>
      <div className="service-guide-workspace">
        <nav className="service-guide-choices" aria-label="Choose your next step">
          {questions.map((item, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={topic === String(index)}
              onClick={() => choose(String(index))}
            >
              <HelpCircle size={18} aria-hidden="true" />
              <span>{item.question}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={topic === 'prepare'}
            onClick={() => choose('prepare')}
          >
            <ListChecks size={18} aria-hidden="true" />
            <span>What to prepare</span>
          </button>
          <button type="button" aria-pressed={topic === 'steps'} onClick={() => choose('steps')}>
            <ArrowRight size={18} aria-hidden="true" />
            <span>How it works</span>
          </button>
          <button
            type="button"
            aria-pressed={topic === 'contact'}
            onClick={() => choose('contact')}
          >
            <MessageCircle size={18} aria-hidden="true" />
            <span>Contact the team</span>
          </button>
        </nav>
        <section
          className="service-guide-result"
          aria-label="Your guidance"
          ref={result}
          tabIndex={-1}
        >
          {topic === 'start' && (
            <>
              <h2>Find your next step</h2>
              <p>Choose a question for guidance, or open one of the services below.</p>
            </>
          )}
          {answer && (
            <>
              <h2>{answer.question}</h2>
              <p>{answer.answer}</p>
            </>
          )}
          {topic === 'steps' && (
            <>
              <h2>How it works</h2>
              <JourneySteps steps={journey.steps} />
            </>
          )}
          {topic === 'prepare' && (
            <div className="service-checklist">
              <h2>What to prepare</h2>
              <ul>
                {journey.checklist.map((item) => (
                  <li key={item}>
                    <Check size={18} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>{journey.note}</p>
            </div>
          )}
          <div hidden={topic !== 'contact'} id="enquire" className="service-guided-enquiry">
            <h2>{journey.action}</h2>
            <p>No account is needed. Share only the details the team needs to help.</p>
            {contactOpened &&
              (enquiry ? (
                <BuiltInForm slug={enquiry.slug} />
              ) : (
                <ContactForm subject={journey.subject} title="Your enquiry" />
              ))}
          </div>
          {topic !== 'contact' && (
            <div className="service-related" aria-label="Related services">
              {journey.related.map((item) => (
                <Link key={item.to} to={item.to}>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <details className="service-visit-details">
        <summary>Location & visiting</summary>
        <CentreVisit />
      </details>
    </div>
  );
}
