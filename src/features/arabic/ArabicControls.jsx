import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Volume2, X } from 'lucide-react';

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

export function ChoiceDialog({ title, description, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="arabic-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="arabic-dialog-inner">
        <header className="arabic-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            className="arabic-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close choices"
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
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
      <span className="arabic-option-top">
        <strong>{label}</strong>
        {selected && <Check size={18} aria-hidden="true" />}
      </span>
      {arabic && (
        <span className="arabic-option-arabic" dir="rtl" lang="ar">
          {arabic}
        </span>
      )}
      {latin && (
        <span className="arabic-option-latin" dir="ltr">
          {latin}
        </span>
      )}
      {description && <span className="arabic-option-description">{description}</span>}
    </button>
  );
}

export function PickerButton({ label, value, onClick, colour = 'stem' }) {
  return (
    <button
      type="button"
      className={`arabic-picker arabic-colour-${colour}`}
      onClick={onClick}
      aria-label={`Change ${label.toLowerCase()}: ${value}`}
      aria-haspopup="dialog"
    >
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      <ChevronDown size={16} aria-hidden="true" />
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

export function ArabicResult({ result, previous, onPartClick, compact = false }) {
  const oldSegments = new Map(
    (previous?.segments || []).map((segment) => [segment.id, segment.arabic]),
  );
  const changed = (segment) => previous && oldSegments.get(segment.id) !== segment.arabic;
  return (
    <div className={`arabic-result ${compact ? 'is-compact' : ''}`}>
      <div className="arabic-result-heading">
        <span>{onPartClick ? 'Tap a coloured part to change it' : 'Your sentence'}</span>
        <SpeakButton arabic={result.arabic} />
      </div>
      <div className="arabic-script" lang="ar" dir="rtl" aria-label={result.arabic}>
        {(result.segments || []).map((segment, index) =>
          onPartClick ? (
            <span
              key={`${segment.id}-${index}`}
              className={`arabic-script-part arabic-colour-${colourFor(segment.id)}`}
              role="button"
              tabIndex={0}
              aria-label={`${segment.label}: ${segment.latin || segment.meaning}. Show choices`}
              onClick={() => onPartClick(segment.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onPartClick(segment.id);
                }
              }}
            >
              {segment.arabic}
            </span>
          ) : (
            <span
              key={`${segment.id}-${index}`}
              className={`arabic-colour-${colourFor(segment.id)}`}
            >
              {segment.arabic}
            </span>
          ),
        )}
        {!result.segments?.length && result.arabic}
      </div>
      <p className="arabic-pronunciation" dir="ltr">
        {result.latin}
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
                className={`arabic-piece arabic-colour-${colourFor(segment.id)} ${changed(segment) ? 'is-changed' : ''}`}
                onClick={() => onPartClick(segment.id)}
                aria-haspopup="dialog"
              >
                <strong dir="ltr">{segment.latin.trim() || '—'}</strong>
                <span>{segment.label}</span>
                {changed(segment) && <small>Changed</small>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function ColourLegend() {
  return (
    <div className="arabic-legend" aria-label="Colour key">
      <span className="arabic-colour-context">Beginning / connector</span>
      <span className="arabic-colour-stem">Core meaning</span>
      <span className="arabic-colour-case">How it fits</span>
      <span className="arabic-colour-owner">Who / whose</span>
      <span className="arabic-colour-number">How many</span>
    </div>
  );
}

export function Explanation({ result, previous }) {
  const notes = result.notes || [];
  return (
    <div className="arabic-explanation">
      {previous && previous.arabic !== result.arabic && (
        <div className="arabic-change" role="status">
          <strong>What changed?</strong>
          <span dir="ltr">
            {previous.latin} <span className="arabic-muted">became</span> {result.latin}
          </span>
          <span>
            {previous.translation === result.translation
              ? 'The meaning stays the same. The word now fits a different position or form.'
              : result.translation}
          </span>
        </div>
      )}
      {notes[0] && (
        <div className="arabic-rule-note">
          <strong>{notes[0].title}</strong>
          <p>{notes[0].body}</p>
        </div>
      )}
      {notes.length > 1 && (
        <details className="arabic-details">
          <summary>
            Why these pieces?{' '}
            <span>
              {notes.length - 1} more {notes.length === 2 ? 'note' : 'notes'}
            </span>
          </summary>
          <div className="arabic-note-list">
            {notes.slice(1).map((note, index) => (
              <div key={index}>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
