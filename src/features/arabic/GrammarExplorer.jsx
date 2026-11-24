import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Clock,
  HelpCircle,
  Layers,
  Link2,
  MapPin,
  Puzzle,
  Type,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ARABIC_REFERENCES, GRAMMAR_TOPICS } from './learningContent.mjs';
import ArabicGlyphs from './ArabicGlyphs';

const icons = {
  pieces: Puzzle,
  people: Users,
  position: Link2,
  many: Layers,
  which: Type,
  matching: Link2,
  where: MapPin,
  when: Clock,
  roots: BookOpen,
  sentence: Type,
  questions: HelpCircle,
};

export default function GrammarExplorer({ onTryExample }) {
  const [selectedId, setSelectedId] = useState('pieces');
  const detailRef = useRef(null);
  const selected = GRAMMAR_TOPICS.find((topic) => topic.id === selectedId) || GRAMMAR_TOPICS[0];

  function chooseTopic(id) {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 700px)').matches) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      });
    }
  }

  return (
    <section className="arabic-explorer" aria-labelledby="arabic-explore-title">
      <header className="arabic-section-heading">
        <h2 id="arabic-explore-title">See how the pieces connect</h2>
        <p className="arabic-muted">
          Start with a question. Learn one pattern, then try changing it.
        </p>
      </header>
      <div className="arabic-explorer-layout">
        <nav className="arabic-explorer-map" aria-label="Arabic learning topics">
          {GRAMMAR_TOPICS.map((topic) => {
            const Icon = icons[topic.icon];
            return (
              <button
                key={topic.id}
                type="button"
                className={`arabic-topic-button${selected.id === topic.id ? ' is-selected' : ''}`}
                aria-pressed={selected.id === topic.id}
                aria-controls="arabic-topic-detail"
                onClick={() => chooseTopic(topic.id)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>
                  <strong>{topic.label}</strong>
                  <span>{topic.question}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <article
          className="arabic-topic-detail arabic-panel"
          id="arabic-topic-detail"
          ref={detailRef}
          aria-labelledby="arabic-topic-title"
        >
          <p className="arabic-eyebrow">{selected.question}</p>
          <h3 id="arabic-topic-title">{selected.title}</h3>
          <p>{selected.explanation}</p>
          <div className="arabic-example-grid">
            {selected.examples.map((example) => (
              <div className="arabic-example" key={example.ar}>
                <p className="arabic-text" lang="ar" dir="rtl">
                  <ArabicGlyphs result={{ arabic: example.ar }} />
                </p>
                <p className="arabic-latin" dir="ltr">
                  {example.latin}
                </p>
                <strong>{example.english}</strong>
                {example.note && <p className="arabic-muted">{example.note}</p>}
              </div>
            ))}
          </div>
          <p className="arabic-takeaway">
            <strong>Keep this idea:</strong> {selected.remember}
          </p>
          {onTryExample && (
            <button
              className="arabic-primary"
              type="button"
              onClick={() => onTryExample(selected.tryState)}
            >
              {selected.tryLabel}
            </button>
          )}
          <details className="arabic-details" key={selected.id}>
            <summary>The grammar names, if you want them</summary>
            <p>{selected.terms}</p>
          </details>
        </article>
      </div>
      <details className="arabic-sources arabic-details">
        <summary>Keep learning with the Qur’an and grammar references</summary>
        <p>
          These are original teaching examples in Fuṣḥā. Use the existing reader to see the Qur’an’s
          text in its own context.
        </p>
        <Link className="arabic-text-link" to="/worship/quran">
          Open the JIC Qur’an reader
        </Link>
        <ul>
          {ARABIC_REFERENCES.map((reference) => (
            <li key={reference.href}>
              <a href={reference.href} target="_blank" rel="noopener noreferrer">
                {reference.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="arabic-muted">
          The playground teaches checked patterns with a selected vocabulary. A dictionary helps
          with meanings; complete sentences can involve additional rules.
        </p>
      </details>
    </section>
  );
}
