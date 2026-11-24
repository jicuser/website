import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Volume2, X } from 'lucide-react';
import ArabicGlyphs from './ArabicGlyphs';

export const PART_COLOURS = {
  context: 'context',
  particle: 'context',
  prefix: 'owner',
  stem: 'stem',
  root: 'stem',
  article: 'context',
  case: 'case',
  ending: 'owner',
  vowel: 'case',
  owner: 'owner',
  subject: 'owner',
  suffix: 'owner',
  person: 'owner',
  number: 'number',
};

export function colourFor(id) {
  return PART_COLOURS[id.split(':').at(-1)] || 'stem';
}

export const VOWEL_CHOICES = [
  {
    id: 'u',
    mark: 'ُ',
    name: 'Ḍamma',
    sound: 'u',
    contextId: 'this',
    label: 'This is…',
    colour: 'damma',
  },
  {
    id: 'a',
    mark: 'َ',
    name: 'Fatḥa',
    sound: 'a',
    contextId: 'saw',
    label: 'I saw…',
    colour: 'fatha',
  },
  { id: 'i', mark: 'ِ', name: 'Kasra', sound: 'i', contextId: 'in', label: 'In…', colour: 'kasra' },
];

export function vowelColour(arabic = '') {
  if (/[ٍِ]/u.test(arabic)) return 'kasra';
  if (/[ٌُ]/u.test(arabic)) return 'damma';
  if (/[ًَ]/u.test(arabic)) return 'fatha';
  return 'case';
}

/** Choices stay beside the result: no backdrop, focus trap or full-screen sheet. */
export function InlineChoices({
  title,
  description,
  onClose,
  children,
  id,
  className = '',
  colour = 'stem',
}) {
  const titleId = useId();
  const tray = useRef(null);
  const openingControl = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback(() => {
    const builder = tray.current?.closest('.arabic-builder');
    const fallback =
      builder?.querySelector('button[aria-expanded="true"][aria-controls]') ||
      builder?.querySelector('.arabic-piece[aria-pressed="true"]');
    const target = openingControl.current?.isConnected ? openingControl.current : fallback;
    onCloseRef.current();
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const builder = tray.current?.closest('.arabic-builder');
    const active = document.activeElement;
    openingControl.current =
      active instanceof HTMLElement && builder?.contains(active) && active.matches('button')
        ? active
        : builder?.querySelector('button[aria-expanded="true"][aria-controls]');
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    builder?.addEventListener('keydown', onKeyDown);
    return () => builder?.removeEventListener('keydown', onKeyDown);
  }, [close]);
  return (
    <section
      ref={tray}
      id={id}
      className={`arabic-choice-tray arabic-colour-${colour} ${className}`}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (!event.target.closest('.arabic-option, .arabic-vowel-option')) return;
        const builder = tray.current?.closest('.arabic-builder');
        window.requestAnimationFrame(() => {
          const result = builder?.querySelector('.arabic-result');
          if (!result || result.getBoundingClientRect().top >= 0) return;
          builder.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
          });
        });
      }}
    >
      <header className="arabic-choice-heading">
        <div>
          <h3 id={titleId}>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <button
          className="arabic-choice-done"
          type="button"
          onClick={close}
          aria-label="Close choices"
        >
          <X size={17} aria-hidden="true" />
          <span>Done</span>
        </button>
      </header>
      <div className="arabic-choice-body">{children}</div>
    </section>
  );
}

export function OptionButton({
  selected,
  label,
  arabic,
  latin,
  description,
  onClick,
  colour = 'stem',
}) {
  return (
    <button
      type="button"
      className={`arabic-option arabic-colour-${colour} ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="arabic-option-copy">
        <strong>{label}</strong>
        {latin && (
          <span className="arabic-option-latin" dir="ltr">
            {latin}
          </span>
        )}
        {description && <span className="arabic-option-description">{description}</span>}
      </span>
      {arabic && (
        <span className="arabic-option-arabic" dir="rtl" lang="ar">
          {arabic}
        </span>
      )}
      {selected && <Check className="arabic-option-check" size={15} aria-hidden="true" />}
    </button>
  );
}

export function PickerButton({ label, value, onClick, colour = 'stem', expanded, controlsId }) {
  return (
    <button
      type="button"
      className={`arabic-picker arabic-colour-${colour}`}
      onClick={onClick}
      aria-label={`Change ${label.toLowerCase()}: ${value}`}
      aria-expanded={expanded}
      aria-controls={expanded ? controlsId : undefined}
    >
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
  );
}

export function SpeakButton({ arabic }) {
  const [voice, setVoice] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const update = () =>
      setVoice(
        window.speechSynthesis.getVoices().find((item) => /^ar(?:-|$)/i.test(item.lang)) || null,
      );
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update);
      window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setMessage('');
  }, [arabic]);
  const speak = () => {
    if (!voice) {
      setMessage(
        'No Arabic voice is available on this device. The pronunciation is written below the Arabic.',
      );
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(arabic);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.75;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setMessage('Audio could not play. Use the written pronunciation or try again.');
    };
    window.speechSynthesis.speak(utterance);
  };
  return (
    <div className="arabic-listen">
      <button
        type="button"
        className="arabic-quiet"
        onClick={speak}
        aria-label="Listen to the Arabic with your device voice"
      >
        <Volume2 size={17} aria-hidden="true" />
        {speaking ? 'Speaking…' : 'Listen'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export function ArabicResult({ result, previous, onPartClick, compact = false, selectedPart }) {
  const oldSegments = new Map(
    (previous?.segments || []).map((segment) => [segment.id, segment.arabic]),
  );
  const changed = (segment) => previous && oldSegments.get(segment.id) !== segment.arabic;
  const segmentColour = (segment) =>
    segment.id.split(':').at(-1) === 'case' ? vowelColour(segment.arabic) : colourFor(segment.id);
  return (
    <div className={`arabic-result ${compact ? 'is-compact' : ''}`}>
      <div className="arabic-result-heading">
        <span>{onPartClick ? 'Tap a piece. Watch it change.' : 'Your sentence'}</span>
        <SpeakButton arabic={result.arabic} />
      </div>
      <div className="arabic-script" lang="ar" dir="rtl">
        <ArabicGlyphs
          result={result}
          onPartClick={onPartClick}
          selectedPart={selectedPart}
          colourFor={colourFor}
        />
      </div>
      <p className="arabic-pronunciation" dir="ltr" aria-label={result.latin}>
        {result.segments?.length
          ? result.segments.map((segment, index) => (
              <span
                key={`${segment.id}-${index}`}
                className={`arabic-colour-${segmentColour(segment)}`}
              >
                {segment.latin}
              </span>
            ))
          : result.latin}
      </p>
      <p className="arabic-translation">
        {result.englishParts?.length
          ? result.englishParts.map((part, index) => (
              <span key={index} className={`arabic-colour-${colourFor(part.id)}`}>
                {part.text}
              </span>
            ))
          : result.translation}
      </p>
      {onPartClick && (
        <div className="arabic-parts" aria-label="The pieces of your Arabic">
          {(result.segments || [])
            .filter(
              (segment) =>
                segment.id !== 'punctuation' && (segment.arabic.trim() || segment.latin.trim()),
            )
            .map((segment, index) => (
              <button
                type="button"
                key={`${segment.id}-${index}`}
                className={`arabic-piece arabic-colour-${segmentColour(segment)} ${changed(segment) ? 'is-changed' : ''} ${selectedPart === segment.id ? 'is-selected' : ''}`}
                onClick={() => onPartClick(segment.id)}
                aria-label={`${segment.label}: ${segment.latin.trim() || segment.meaning}. Change this piece`}
                aria-pressed={selectedPart === segment.id}
              >
                <span className="arabic-piece-value">
                  {segment.id.split(':').at(-1) === 'case' &&
                    /[\u064b-\u0652]/u.test(segment.arabic) && (
                      <span className="arabic-piece-mark" lang="ar" aria-hidden="true">
                        ـ{segment.arabic.replace(/[^\u064b-\u0652]/gu, '')}
                      </span>
                    )}
                  <strong dir="ltr">{segment.latin.trim() || '—'}</strong>
                </span>
                <span className="arabic-piece-label">
                  {segment.id.split(':').at(-1) === 'case' &&
                  /[\u064b-\u0652]/u.test(segment.arabic)
                    ? 'Vowel'
                    : segment.label}
                </span>
              </button>
            ))}
        </div>
      )}
      {previous && previous.arabic !== result.arabic && (
        <span className="sr-only" role="status">
          {result.latin}. {result.translation}
        </span>
      )}
    </div>
  );
}

export function ColourLegend() {
  return (
    <details className="arabic-details arabic-colour-guide">
      <summary>Colour guide</summary>
      <div className="arabic-vowel-key" aria-label="Vowel colours">
        {VOWEL_CHOICES.map((vowel) => (
          <span key={vowel.id} className={`arabic-colour-${vowel.colour}`}>
            <b lang="ar">ـ{vowel.mark}</b>
            <strong>{vowel.sound}</strong>
            <span>{vowel.name}</span>
          </span>
        ))}
      </div>
      <div className="arabic-legend" aria-label="Word part colours">
        <span className="arabic-colour-context">Beginning</span>
        <span className="arabic-colour-stem">Word</span>
        <span className="arabic-colour-owner">Who / whose</span>
        <span className="arabic-colour-number">How many</span>
      </div>
    </details>
  );
}

export function Explanation({ result, previous }) {
  const notes = result.notes || [];
  if (!notes.length) return null;
  return (
    <details className="arabic-details arabic-explanation">
      <summary>
        {previous && previous.arabic !== result.arabic ? 'Why did it change?' : 'Why this form?'}
      </summary>
      {previous && previous.arabic !== result.arabic && (
        <div className="arabic-change">
          <span dir="ltr">
            {previous.latin} <span className="arabic-muted">became</span> {result.latin}
          </span>
        </div>
      )}
      <div className="arabic-note-list">
        {notes.map((note, index) => (
          <div key={index}>
            <strong>{note.title}</strong>
            <p>{note.body}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
