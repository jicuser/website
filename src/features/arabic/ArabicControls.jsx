import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Volume2, X } from 'lucide-react';
import ArabicGlyphs, { ArabicGlyphCloseup } from './ArabicGlyphs';
import ArabicConnectionLayer from './ArabicConnectionLayer';
import {
  meaningConnections,
  selectedMeaningConnection,
  unmatchedArabicParts,
  resolveMarkFocus,
  segmentRanges,
} from './arabicConnectionModel.mjs';
import './arabic-connections.css';

export { ArabicGlyphCloseup } from './ArabicGlyphs';

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

function isVisibleFocusTarget(target) {
  if (!(target instanceof HTMLElement) || !target.isConnected || target.closest?.('[hidden]'))
    return false;
  const closed = target.closest?.('details:not([open])');
  const summary = closed?.querySelector(':scope > summary');
  if (closed && summary !== target && !summary?.contains(target)) return false;
  return typeof target.getClientRects !== 'function' || target.getClientRects().length > 0;
}

function visibleControl(builder, selector, excludeChoices = false) {
  const candidates = builder?.querySelectorAll
    ? [...builder.querySelectorAll(selector)]
    : [builder?.querySelector(selector)];
  return candidates.find(
    (target) =>
      isVisibleFocusTarget(target) && (!excludeChoices || !target.closest?.('.arabic-choice-tray')),
  );
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
      visibleControl(builder, 'button[aria-expanded="true"][aria-controls]') ||
      visibleControl(
        builder,
        '.arabic-meaning-chip[aria-pressed="true"], .arabic-part-control[aria-pressed="true"], .arabic-piece[aria-pressed="true"]',
      );
    const disclosure = openingControl.current?.closest?.('details:not([open])');
    const summary = disclosure?.querySelector(':scope > summary');
    const target = isVisibleFocusTarget(openingControl.current)
      ? openingControl.current
      : isVisibleFocusTarget(summary)
        ? summary
        : fallback || visibleControl(builder, 'button, summary', true);
    onCloseRef.current();
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const builder = tray.current?.closest('.arabic-builder');
    const active = document.activeElement;
    openingControl.current =
      active instanceof HTMLElement &&
      builder?.contains(active) &&
      active.matches('button[aria-expanded="true"]')
        ? active
        : visibleControl(builder, 'button[aria-expanded="true"][aria-controls]');
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

const tailPart = (id) => id.split(':').at(-1);
const shortPartLabel = (segment) =>
  ({
    case: segment.label === 'Present ending' ? 'Ending' : 'Vowel',
    number: 'Number',
    context: 'Beginning',
    article: 'The',
    stem: 'Word',
    owner: 'Whose?',
    prefix: 'Who?',
    ending: 'Ending',
  })[tailPart(segment.id)] || segment.label;

export function ArabicResult({
  result,
  previous,
  onPartClick,
  compact = false,
  selectedPart,
  selectedMeaningId,
  controlLabels = {},
  choiceControlsId,
  meaningTargets = {},
  showPieces = false,
}) {
  const containerRef = useRef(null);
  const [intent, setIntent] = useState(null);
  const connections = useMemo(
    () => meaningConnections(result, meaningTargets),
    [result, meaningTargets],
  );
  const unmatched = useMemo(() => unmatchedArabicParts(result, connections), [result, connections]);
  const ranges = useMemo(() => segmentRanges(result), [result]);
  useEffect(() => {
    if (!selectedPart) setIntent(null);
  }, [selectedPart]);
  const segmentColour = (segment) =>
    tailPart(segment.id) === 'case' ? vowelColour(segment.arabic) : colourFor(segment.id);
  const rememberedFocus =
    intent?.kind === 'mark' &&
    intent.partId === selectedPart &&
    (!selectedMeaningId || intent.meaningId === selectedMeaningId)
      ? resolveMarkFocus(result, intent)
      : null;
  const focus =
    rememberedFocus ||
    (tailPart(selectedPart || '') === 'case'
      ? resolveMarkFocus(result, { partId: selectedPart })
      : null);
  const activeMeaning = focus
    ? null
    : selectedMeaningConnection(connections, {
        selectedPart,
        selectedMeaningId,
        rememberedKey: intent?.kind === 'meaning' ? intent.key : undefined,
      });
  const activeFallback = unmatched.find((part) => part.id === selectedPart);
  const targetIds = focus
    ? [focus.partId]
    : activeMeaning?.targetIds || (activeFallback ? [activeFallback.id] : []);
  const controlKey = focus
    ? activeFallback
      ? `part-${activeFallback.id}`
      : 'vowel-focus'
    : activeMeaning?.key || (activeFallback ? `part-${activeFallback.id}` : null);
  const connectionColour = focus?.mark.colour || colourFor(targetIds[0] || selectedPart || 'stem');

  const pickGlyph = (id, detail = {}) => {
    const range = ranges.find((part) => part.id === id);
    setIntent(
      detail.mark && range
        ? {
            kind: 'mark',
            partId: id,
            localOffset: detail.sourceIndex - range.start,
            meaningId:
              connections.find((part) => part.id === id)?.id ||
              connections.find((part) => part.targetIds.includes(id))?.id ||
              id,
          }
        : null,
    );
    onPartClick?.(id, detail);
  };
  const pickMeaning = (part) => {
    setIntent({ kind: 'meaning', key: part.key });
    onPartClick?.(part.actionId, { meaningId: part.id, targetIds: part.targetIds });
  };
  const pickFallback = (part) => {
    const mark =
      tailPart(part.id) === 'case' ? resolveMarkFocus(result, { partId: part.id }) : null;
    setIntent(
      mark
        ? { kind: 'mark', partId: part.id, localOffset: mark.localOffset, meaningId: part.id }
        : null,
    );
    onPartClick?.(
      part.id,
      mark
        ? { mark: mark.mark.id, character: mark.character, sourceIndex: mark.sourceIndex }
        : undefined,
    );
  };
  const labelFor = (part, targetId) =>
    controlLabels[part.id] || controlLabels[targetId] || `Change ${part.text.trim()}`;
  const selectedAttributes = (selected, expanded = selected) => ({
    'aria-pressed': Boolean(selected),
    'aria-expanded': choiceControlsId ? Boolean(expanded) : undefined,
    'aria-controls': expanded && choiceControlsId ? choiceControlsId : undefined,
  });
  const meaning = (part) => {
    const interactive = Boolean(onPartClick && part.actionId);
    if (!interactive)
      return (
        <span
          key={part.key}
          className={
            part.actionId ? `arabic-colour-${colourFor(part.actionId)}` : 'arabic-unlinked-meaning'
          }
        >
          {part.text}
        </span>
      );
    const [, leading, text, trailing] = /^(\s*)([\s\S]*?)(\s*)$/.exec(part.text);
    const selected = activeMeaning?.key === part.key;
    return (
      <React.Fragment key={part.key}>
        {leading}
        <button
          type="button"
          className={`arabic-meaning-chip arabic-colour-${colourFor(part.actionId)}`}
          data-meaning-id={part.id}
          data-connection-control={part.key}
          aria-label={labelFor(part, part.actionId)}
          {...selectedAttributes(
            selected,
            selected || (focus && part.targetIds.includes(selectedPart)),
          )}
          onClick={() => pickMeaning(part)}
        >
          {text}
        </button>
        {trailing}
      </React.Fragment>
    );
  };
  const soundNote = focus
    ? tailPart(focus.partId) === 'case'
      ? result.grammar?.verbId || focus.partId.startsWith('action:')
        ? 'A sound in the verb’s ending.'
        : 'This sound helps the word fit its sentence.'
      : ['owner', 'prefix', 'ending'].includes(tailPart(focus.partId))
        ? 'A sound inside the person ending or beginning.'
        : 'This sound belongs to the word.'
    : '';

  return (
    <div className={`arabic-result ${compact ? 'is-compact' : ''}`}>
      <div className="arabic-result-heading">
        <span>{onPartClick ? 'Tap the meaning or the Arabic.' : 'Your sentence'}</span>
        <SpeakButton arabic={result.arabic} />
      </div>
      <div ref={containerRef} className="arabic-connected-display">
        <div className="arabic-script" lang="ar" dir="rtl">
          <ArabicGlyphs
            result={result}
            onPartClick={onPartClick ? pickGlyph : undefined}
            selectedPart={focus ? undefined : activeMeaning ? undefined : selectedPart}
            selectedParts={focus ? [] : activeMeaning?.targetIds || []}
            selectedSourceIndex={focus?.sourceIndex}
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
        <p className="arabic-translation">{connections.map(meaning)}</p>
        {onPartClick &&
          (showPieces ? result.segments || [] : unmatched).filter(
            (part) => part.id !== 'punctuation' && part.arabic.trim(),
          ).length > 0 && (
            <div
              className={showPieces ? 'arabic-parts' : 'arabic-unmatched-parts'}
              aria-label="Arabic sounds and other parts"
            >
              {(showPieces ? result.segments || [] : unmatched)
                .filter((part) => part.id !== 'punctuation' && part.arabic.trim())
                .map((part) => (
                  <button
                    type="button"
                    key={part.id}
                    className={`${showPieces ? 'arabic-piece' : 'arabic-part-control'} arabic-colour-${segmentColour(part)}`}
                    data-connection-control={`part-${part.id}`}
                    aria-label={
                      controlLabels[part.id] ||
                      `${part.label}: ${part.latin.trim() || part.meaning}. Change this piece`
                    }
                    {...selectedAttributes(selectedPart === part.id)}
                    onClick={() => pickFallback(part)}
                  >
                    <span>{shortPartLabel(part)}</span>
                    <strong dir="ltr">{part.latin.trim() || '—'}</strong>
                  </button>
                ))}
            </div>
          )}
        {focus && onPartClick && (
          <figure
            className={`arabic-vowel-focus arabic-colour-${focus.mark.colour}`}
            data-connection-control="vowel-focus"
            aria-label={`${focus.mark.name} on ${focus.letter}`}
          >
            <ArabicGlyphCloseup result={result} sourceIndex={focus.sourceIndex} />
            <figcaption>
              <strong>
                {focus.mark.name} · {focus.mark.sound}
              </strong>
              <p>{soundNote}</p>
            </figcaption>
          </figure>
        )}
        {onPartClick && (
          <ArabicConnectionLayer
            containerRef={containerRef}
            controlKey={controlKey}
            partIds={targetIds}
            sourceIndex={focus?.sourceIndex}
            colour={connectionColour}
            measureKey={`${result.arabic}|${result.translation}|${showPieces}`}
          />
        )}
      </div>
      {previous &&
        (previous.arabic !== result.arabic || previous.translation !== result.translation) && (
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
