import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Compass,
  ExternalLink,
  RotateCcw,
  X,
} from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { GUIDED_JOURNEYS, HELP_RESOURCES } from './journeys';
import './guidance.css';

export function GuidanceLink({ item, className = '' }) {
  const { getContent } = useContent();
  if (item.to.startsWith('/') && !isPageVisible(getContent, item.to)) return null;
  const external = /^https:\/\//.test(item.to);
  const content = (
    <>
      <span>{item.label}</span>
      {external ? (
        <ExternalLink size={16} aria-hidden="true" />
      ) : (
        <ArrowRight size={16} aria-hidden="true" />
      )}
    </>
  );
  return external || item.to.startsWith('#') ? (
    <a className={className} href={item.to} rel={external ? 'noreferrer' : undefined}>
      {content}
    </a>
  ) : (
    <Link className={className} to={item.to}>
      {content}
    </Link>
  );
}

export function UrgentHelp() {
  return (
    <aside className="guidance-urgent" aria-label="Urgent and specialist help">
      <p>
        <strong>Immediate danger?</strong> Call <a href="tel:999">999</a>.
      </p>
      <div>
        <GuidanceLink item={HELP_RESOURCES.urgent} />
        <GuidanceLink item={{ ...HELP_RESOURCES.safety, label: 'Domestic abuse support' }} />
      </div>
    </aside>
  );
}

export default function GuidancePanel({
  journeyId,
  defaultOpen = true,
  initialNode = 'start',
  onClose,
}) {
  const location = useLocation();
  // A route change discards temporary answers, even when a page component is reused.
  return (
    <GuidanceSession
      key={`${journeyId}:${location.pathname}:${initialNode}`}
      journeyId={journeyId}
      defaultOpen={defaultOpen}
      initialNode={initialNode}
      onClose={onClose}
    />
  );
}

function GuidanceSession({ journeyId, defaultOpen, initialNode, onClose }) {
  const journey = GUIDED_JOURNEYS[journeyId];
  const [open, setOpen] = useState(defaultOpen);
  const [trail, setTrail] = useState([initialNode]);
  const heading = useRef(null);
  const interacted = useRef(Boolean(onClose));
  const instanceId = useId();
  const node = journey?.nodes[trail[trail.length - 1]];
  const { getContent } = useContent();
  useEffect(() => {
    if (interacted.current) heading.current?.focus({ preventScroll: true });
  }, [open, trail]);
  // Page cache/navigation must not retain a sensitive session.
  useEffect(() => {
    const clear = () => {
      setTrail([initialNode]);
      setOpen(defaultOpen);
    };
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, [defaultOpen, initialNode]);
  if (!journey || !node) return null;
  const move = (next) => {
    if (!journey.nodes[next]) return;
    interacted.current = true;
    setTrail((previous) => [...previous, next]);
  };
  const reset = () => {
    interacted.current = true;
    setTrail([initialNode]);
  };
  const close = () => {
    reset();
    setOpen(false);
    onClose?.();
  };
  const links = (node.links || []).filter(
    (item) => !item.to.startsWith('/') || isPageVisible(getContent, item.to),
  );
  return (
    <section
      className={`guidance-panel ${open ? 'is-open' : ''}`}
      aria-labelledby={`${instanceId}-title`}
    >
      {!open ? (
        <div className="guidance-invitation">
          <Compass size={24} aria-hidden="true" />
          <div>
            <h2 id={`${instanceId}-title`}>{journey.title}</h2>
            <p>{journey.description}</p>
          </div>
          <button
            ref={heading}
            type="button"
            onClick={() => {
              interacted.current = true;
              setOpen(true);
            }}
          >
            Get started <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="guidance-toolbar">
            <span>
              <Compass size={17} aria-hidden="true" />{' '}
              {node.choices ? `Question ${trail.length}` : 'Your next step'}
            </span>
            <div>
              {trail.length > 1 && (
                <button type="button" onClick={reset}>
                  <RotateCcw size={15} aria-hidden="true" /> Start again
                </button>
              )}
              {(!defaultOpen || onClose) && (
                <button type="button" onClick={close} aria-label="Close questions">
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <h2 ref={heading} tabIndex={-1} id={`${instanceId}-title`}>
            {node.title}
          </h2>
          {node.body && <p className="guidance-body">{node.body}</p>}
          {node.choices ? (
            <div className="guidance-choices">
              {node.choices.map((option) => (
                <button type="button" key={option.next} onClick={() => move(option.next)}>
                  <span>
                    {option.label}
                    {option.description && <small>{option.description}</small>}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="guidance-result">
              {node.steps?.length > 0 && (
                <ol>
                  {node.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
              {links.length > 0 ? (
                <div className="guidance-links">
                  {links.map((item) => (
                    <GuidanceLink key={item.to} item={item} />
                  ))}
                </div>
              ) : (
                <p>
                  This destination is currently unavailable. Please call the centre for information.
                </p>
              )}
              <p className="guidance-complete">Choose an option above to continue.</p>
            </div>
          )}
          <footer className="guidance-footer">
            {trail.length === 1 && onClose && (
              <button type="button" onClick={close}>
                <ArrowLeft size={16} aria-hidden="true" /> Back to topics
              </button>
            )}
            {trail.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  interacted.current = true;
                  setTrail((previous) => previous.slice(0, -1));
                }}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
            )}
            <GuidanceLink item={{ label: 'Contact the centre', to: '/contact' }} />
          </footer>
          <p className="guidance-privacy">
            Your choices stay on this page and are not sent to JIC.{' '}
            {journey.sensitive
              ? 'Please use direct specialist help for urgent or private concerns.'
              : 'Choose a booking or enquiry only when you’re ready.'}
          </p>
        </>
      )}
    </section>
  );
}
