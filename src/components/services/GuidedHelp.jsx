import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw, ExternalLink } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { HELP_RESOURCES } from '@/content/guidedHelp';
import { advanceGuidance } from '@/lib/guidedHelp';
import { isPageVisible } from '@/lib/pageVisibility';

export function HelpResourceLinks({ ids }) {
  const { getContent } = useContent();
  return (
    <div className="guided-resource-links">
      {ids.map((id) => {
        const item = HELP_RESOURCES[id];
        if (!item || (item.to && !isPageVisible(getContent, item.to))) return null;
        return item.to ? (
          <Link key={id} to={item.to}>
            {item.title}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <a key={id} href={item.href} target="_blank" rel="noreferrer">
            {item.title}
            <ExternalLink size={16} aria-hidden="true" />
            <small>{item.provider} · external website</small>
          </a>
        );
      })}
    </div>
  );
}
export default function GuidedHelp({ journey }) {
  const [trail, setTrail] = useState([]);
  const heading = useRef(null),
    interacted = useRef(false);
  const current = trail.at(-1)?.next || journey.start;
  const question = journey.questions.find((q) => q.id === current);
  const result = journey.results.find((r) => r.id === current);
  useEffect(() => {
    if (interacted.current) heading.current?.focus({ preventScroll: true });
  }, [trail]);
  const update = (next) => {
    interacted.current = true;
    setTrail(next);
  };
  if (journey.enabled === false) return null;
  return (
    <section className="guided-help" aria-label="Guided next steps">
      <div className="guided-help-progress">
        <small>{question ? `Question ${trail.length + 1}` : 'Your next step'}</small>
        <span>No form needed</span>
      </div>
      <h2 ref={heading} tabIndex={-1}>
        {question?.title || result?.title}
      </h2>
      {question ? (
        <div className="guided-help-choices">
          {question.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => update(advanceGuidance(journey, trail, choice.id))}
            >
              {choice.label}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        result && (
          <div className="guided-help-result">
            <p>{result.body}</p>
            {result.steps.length > 0 && (
              <ol>
                {result.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
            <HelpResourceLinks ids={result.resources} />
          </div>
        )
      )}
      {trail.length > 0 && (
        <div className="guided-help-actions">
          <button type="button" onClick={() => update(trail.slice(0, -1))}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <button type="button" onClick={() => update([])}>
            <RotateCcw size={16} aria-hidden="true" />
            Start again
          </button>
        </div>
      )}
    </section>
  );
}
