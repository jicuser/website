import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ScanText, Search, Table2, X } from 'lucide-react';
import ArabicGlyphs, { ArabicGlyphCloseup } from './ArabicGlyphs';
import ArabicConnectionLayer from './ArabicConnectionLayer';
import { SpeakButton } from './ArabicControls';
import { glyphColourFor, HARAKAT } from './arabicGlyphModel.mjs';
import { meaningConnections } from './arabicConnectionModel.mjs';
import { NOUNS, OWNERS, PERSONS, VERBS, getAvailableNumbers } from './grammar.mjs';
import {
  GUIDED_WORD_TYPES,
  POINTING_WORDS,
  INITIAL_GUIDED_SELECTION,
  buildGuidedWord,
  explainGuidedWordPart,
  searchVocabulary,
} from './guidedWordData.mjs';

const TYPE_LABELS = { pointing: 'Pointing', noun: 'Things', verb: 'Actions' };
const COMMON_PEOPLE = ['i', 'we', 'you_m', 'you_f', 'he', 'she'];
const COMMON_OWNERS = ['none', 'my', 'our', 'your_m', 'your_f', 'his', 'her'];
const STORAGE_KEY = 'jic.arabic.word-study.v1';
const STORED_CHOICES = {
  type: GUIDED_WORD_TYPES.map((entry) => entry.id),
  pointingId: POINTING_WORDS.map((entry) => entry.id),
  nounId: NOUNS.map((entry) => entry.id),
  ownerId: OWNERS.map((entry) => entry.id),
  number: ['singular', 'dual', 'plural'],
  definiteness: ['indefinite', 'definite'],
  verbId: VERBS.map((entry) => entry.id),
  personId: COMMON_PEOPLE,
  tenseId: ['past', 'present'],
};

function restoreSelection() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_GUIDED_SELECTION;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved))
      return INITIAL_GUIDED_SELECTION;
    const restored = { ...INITIAL_GUIDED_SELECTION };
    for (const [key, options] of Object.entries(STORED_CHOICES))
      if (options.includes(saved[key])) restored[key] = saved[key];
    if (!getAvailableNumbers(restored.nounId).some((entry) => entry.id === restored.number))
      restored.number = 'singular';
    return restored;
  } catch {
    return INITIAL_GUIDED_SELECTION;
  }
}

const referenceFor = (type) => ({ pointing: 'pointing', noun: 'owners', verb: 'verbs' })[type];
const latinColour = (segment) =>
  segment.id.split(':').at(-1) === 'case'
    ? Array.from(segment.arabic)
        .map((character) => HARAKAT[character]?.colour)
        .find(Boolean) || 'case'
    : glyphColourFor(segment.id);

/** A single checked word, with source-based questions rather than free vowel editing. */
export default function GuidedWordStudy({ onBuildSentence, onOpenReference, onWordChange }) {
  const id = useId();
  const canvasRef = useRef(null);
  const openerRef = useRef(null);
  const searchRef = useRef(null);
  const [selection, setSelection] = useState(restoreSelection);
  const [panel, setPanel] = useState(null);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [inspectMode, setInspectMode] = useState('parts');
  const [focus, setFocus] = useState(null);
  const result = useMemo(() => buildGuidedWord(selection), [selection]);
  const pointing = POINTING_WORDS.find((entry) => entry.id === selection.pointingId);
  const noun = NOUNS.find((entry) => entry.id === selection.nounId);
  const verb = VERBS.find((entry) => entry.id === selection.verbId);
  const owner = OWNERS.find((entry) => entry.id === selection.ownerId);
  const person = PERSONS.find((entry) => entry.id === selection.personId);
  const note = focus ? explainGuidedWordPart(result, focus) : null;
  const mark = focus?.sourceIndex != null ? HARAKAT[result.arabic[focus.sourceIndex]] : null;
  const meanings = useMemo(() => meaningConnections(result), [result]);
  const vocabulary = selection.type === 'noun' ? NOUNS : VERBS;
  const matches = panel === 'word' ? searchVocabulary(vocabulary, query) : [];
  const shownWords = query || showAll ? matches : matches.slice(0, 8);
  const parts = result.study.parts;
  const characters = useMemo(() => {
    let sourceIndex = 0;
    return Array.from(result.arabic, (character) => {
      const item = { character, sourceIndex, mark: HARAKAT[character] };
      sourceIndex += character.length;
      return item;
    }).filter((item) => !/\s/u.test(item.character));
  }, [result.arabic]);
  const panelTitle = {
    word: selection.type === 'noun' ? 'Choose a thing' : 'Choose an action',
    owner: 'Whose?',
    person: 'Who?',
    inspect: 'Look inside the word',
  }[panel];

  useEffect(() => {
    onWordChange?.({ selection, result });
  }, [onWordChange, selection, result]);
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // Word study remains usable when device storage is unavailable or full.
    }
  }, [selection]);
  useEffect(() => {
    if (panel === 'word') searchRef.current?.focus();
  }, [panel]);

  const choose = (patch) => {
    setSelection((current) => {
      const next = { ...current, ...patch };
      if (!getAvailableNumbers(next.nounId).some((entry) => entry.id === next.number))
        next.number = 'singular';
      return next;
    });
    setFocus(null);
  };
  const closePanel = () => {
    setPanel(null);
    openerRef.current?.focus?.({ preventScroll: true });
  };
  const openPanel = (next, event) => {
    if (panel === next) {
      closePanel();
      return;
    }
    openerRef.current = event?.currentTarget || null;
    setPanel(next);
    setQuery('');
    setShowAll(false);
  };
  const changeType = (type) => {
    choose({ type });
    setPanel(null);
    setQuery('');
    setShowAll(false);
  };
  const pick = (partId, detail = {}) => {
    setFocus(detail.sourceIndex == null ? { partId } : { partId, sourceIndex: detail.sourceIndex });
  };
  const picker = (name, value, next) => (
    <button
      type="button"
      className="arabic-guided-picker"
      aria-label={`${name}: ${value}`}
      aria-expanded={panel === next}
      aria-controls={panel === next ? `${id}-choices` : undefined}
      onClick={(event) => openPanel(next, event)}
    >
      <span>{name}</span>
      <strong>{value}</strong>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
  );

  const choiceTray = panel && (
    <section
      id={`${id}-choices`}
      className={`arabic-guided-tray is-${panel}`}
      aria-labelledby={`${id}-choices-title`}
    >
      <div className="arabic-guided-tray-heading">
        <h3 id={`${id}-choices-title`}>{panelTitle}</h3>
        <button type="button" aria-label="Close word choices" onClick={closePanel}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>
      {panel === 'word' && (
        <>
          <label className="arabic-guided-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Find an Arabic word</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="English, Arabic or pronunciation"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="arabic-guided-options" role="group" aria-label="Vocabulary choices">
            {shownWords.map((entry) => (
              <button
                type="button"
                key={entry.id}
                aria-pressed={
                  entry.id === (selection.type === 'noun' ? selection.nounId : selection.verbId)
                }
                onClick={() => {
                  choose(selection.type === 'noun' ? { nounId: entry.id } : { verbId: entry.id });
                  closePanel();
                }}
              >
                <span>{entry.label}</span>
                <span lang="ar" dir="rtl">
                  {entry.arabic}
                </span>
              </button>
            ))}
          </div>
          {!shownWords.length && (
            <p className="arabic-guided-empty">No match yet. Try “house”, “book” or “write”.</p>
          )}
          {!query && matches.length > 8 && (
            <button
              type="button"
              className="arabic-guided-more"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Common words' : `All ${matches.length} words`}
            </button>
          )}
        </>
      )}
      {(panel === 'owner' || panel === 'person') && (
        <>
          <div
            className="arabic-guided-options"
            role="group"
            aria-label={panel === 'owner' ? 'Owner choices' : 'Person choices'}
          >
            {(panel === 'owner'
              ? OWNERS.filter((entry) => showAll || COMMON_OWNERS.includes(entry.id))
              : PERSONS.filter((entry) => COMMON_PEOPLE.includes(entry.id))
            ).map((entry) => (
              <button
                type="button"
                key={entry.id}
                aria-pressed={
                  entry.id === (panel === 'owner' ? selection.ownerId : selection.personId)
                }
                onClick={() => {
                  choose(panel === 'owner' ? { ownerId: entry.id } : { personId: entry.id });
                  closePanel();
                }}
              >
                <span>{entry.label}</span>
                {entry.arabic && (
                  <span lang="ar" dir="rtl">
                    {entry.arabic}
                  </span>
                )}
              </button>
            ))}
          </div>
          {panel === 'owner' && (
            <button
              type="button"
              className="arabic-guided-more"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Common owners' : 'More owners'}
            </button>
          )}
        </>
      )}
      {panel === 'inspect' && (
        <>
          <div className="arabic-guided-switch" role="group" aria-label="How to look inside">
            <button
              type="button"
              aria-pressed={inspectMode === 'parts'}
              onClick={() => setInspectMode('parts')}
            >
              {selection.type === 'pointing' ? 'Reading parts' : 'Meaningful parts'}
            </button>
            <button
              type="button"
              aria-pressed={inspectMode === 'sounds'}
              onClick={() => setInspectMode('sounds')}
            >
              Letters & vowels
            </button>
          </div>
          <div
            className="arabic-guided-options arabic-guided-inspection"
            role="group"
            aria-label={
              inspectMode === 'parts' ? 'Parts of this word' : 'Letters and vowels in this word'
            }
          >
            {inspectMode === 'parts'
              ? parts.map((part) => (
                  <button
                    type="button"
                    key={part.id}
                    className={`arabic-colour-${glyphColourFor(part.partId)}`}
                    aria-pressed={focus?.partId === part.partId && focus?.sourceIndex == null}
                    onClick={() => pick(part.partId)}
                  >
                    <span>{part.title}</span>
                    <strong dir="ltr">{part.latin}</strong>
                  </button>
                ))
              : characters.map((item) => {
                  const part = parts.find(
                    (entry) =>
                      entry.sourceStart <= item.sourceIndex && entry.sourceEnd > item.sourceIndex,
                  );
                  const description = explainGuidedWordPart(result, {
                    sourceIndex: item.sourceIndex,
                    partId: part?.partId,
                  });
                  return (
                    <button
                      type="button"
                      key={item.sourceIndex}
                      data-guided-source-index={item.sourceIndex}
                      className={`arabic-colour-${item.mark?.colour || glyphColourFor(part?.partId || 'stem')}`}
                      aria-label={`${item.mark ? `${item.mark.name}: ${item.mark.sound}` : description?.title || item.character}. Position ${item.sourceIndex + 1}`}
                      aria-pressed={focus?.sourceIndex === item.sourceIndex}
                      onClick={() => pick(part?.partId, { sourceIndex: item.sourceIndex })}
                    >
                      {item.mark ? (
                        <>
                          <span>{item.mark.name}</span>
                          <strong>{item.mark.sound}</strong>
                        </>
                      ) : (
                        <>
                          <strong lang="ar" dir="rtl">
                            {item.character}
                          </strong>
                          <span>Letter</span>
                        </>
                      )}
                    </button>
                  );
                })}
          </div>
          {onOpenReference && (
            <button
              type="button"
              className="arabic-guided-more"
              onClick={(event) =>
                onOpenReference(
                  inspectMode === 'sounds' ? 'sounds' : referenceFor(selection.type),
                  event.currentTarget,
                )
              }
            >
              <Table2 size={16} aria-hidden="true" />
              See the {inspectMode === 'sounds' ? 'sounds' : 'related'} table
            </button>
          )}
        </>
      )}
    </section>
  );

  return (
    <section
      className="arabic-guided-study"
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && panel) {
          event.stopPropagation();
          closePanel();
        }
      }}
    >
      <header className="arabic-guided-heading">
        <div>
          <h2 id={`${id}-title`}>Explore one word</h2>
          <p>Choose a word. Tap a letter or vowel to see why it is there.</p>
        </div>
        {onOpenReference && (
          <button
            type="button"
            className="arabic-guided-table-button"
            aria-label={`Open ${referenceFor(selection.type)} table`}
            onClick={(event) => onOpenReference(referenceFor(selection.type), event.currentTarget)}
          >
            <Table2 size={18} aria-hidden="true" />
            <span>Table</span>
          </button>
        )}
      </header>
      <div className="arabic-guided-types" role="group" aria-label="Word types">
        {GUIDED_WORD_TYPES.map((type) => (
          <button
            type="button"
            key={type.id}
            aria-pressed={selection.type === type.id}
            onClick={() => changeType(type.id)}
          >
            {TYPE_LABELS[type.id]}
          </button>
        ))}
      </div>
      <div className="arabic-guided-controls">
        {selection.type === 'pointing' ? (
          <>
            <div className="arabic-guided-switch" role="group" aria-label="Near or far">
              {['near', 'far'].map((distance) => (
                <button
                  type="button"
                  key={distance}
                  aria-pressed={pointing.distance === distance}
                  onClick={() =>
                    choose({
                      pointingId: POINTING_WORDS.find(
                        (entry) => entry.distance === distance && entry.gender === pointing.gender,
                      ).id,
                    })
                  }
                >
                  {distance === 'near' ? 'This' : 'That'}
                </button>
              ))}
            </div>
            <div
              className="arabic-guided-pointing-pair"
              role="group"
              aria-label="Choose a pointing word"
            >
              {POINTING_WORDS.filter((entry) => entry.distance === pointing.distance).map(
                (entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    aria-label={`${entry.latin}: ${entry.gender === 'm' ? 'masculine' : 'feminine'}`}
                    aria-pressed={entry.id === selection.pointingId}
                    onClick={() => choose({ pointingId: entry.id })}
                  >
                    <span lang="ar" dir="rtl">
                      {entry.arabic}
                    </span>
                    <span>{entry.gender === 'm' ? 'Masculine' : 'Feminine'}</span>
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <>
            {picker('Word', selection.type === 'noun' ? noun.label : verb.label, 'word')}
            {selection.type === 'noun' ? (
              picker('Whose?', owner.label, 'owner')
            ) : (
              <>
                {picker('Who?', person.label, 'person')}
                <div
                  className="arabic-guided-switch"
                  role="group"
                  aria-label="When the action happens"
                >
                  <button
                    type="button"
                    aria-pressed={selection.tenseId === 'present'}
                    onClick={() => choose({ tenseId: 'present' })}
                  >
                    Now / usually
                  </button>
                  <button
                    type="button"
                    aria-pressed={selection.tenseId === 'past'}
                    onClick={() => choose({ tenseId: 'past' })}
                  >
                    Past
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {panel !== 'inspect' && choiceTray}
      <div className="arabic-guided-canvas" ref={canvasRef}>
        <div className="arabic-guided-canvas-heading">
          <span>One Arabic word</span>
          <SpeakButton arabic={result.arabic} />
        </div>
        <div className="arabic-guided-arabic arabic-script" lang="ar" dir="rtl">
          <ArabicGlyphs
            result={result}
            onPartClick={pick}
            selectedSourceIndex={focus?.sourceIndex}
            selectedPart={focus?.sourceIndex == null ? focus?.partId : undefined}
          />
        </div>
        <p className="arabic-guided-latin arabic-pronunciation" dir="ltr" aria-label={result.latin}>
          {result.segments.map((segment, index) => (
            <span
              key={`${segment.id}-${index}`}
              className={`arabic-colour-${latinColour(segment)}`}
            >
              {segment.latin}
            </span>
          ))}
        </p>
        <p className="arabic-guided-meaning arabic-translation">
          {meanings.map((meaning) =>
            meaning.actionId ? (
              <button
                type="button"
                key={meaning.key}
                className={`arabic-guided-meaning-part arabic-colour-${glyphColourFor(meaning.actionId)}`}
                aria-label={`Explain ${meaning.text.trim()}`}
                aria-pressed={focus?.partId === meaning.actionId && focus?.sourceIndex == null}
                onClick={() => pick(meaning.actionId)}
              >
                {meaning.text}
              </button>
            ) : (
              <span
                key={meaning.key}
                className={selection.type === 'pointing' ? 'arabic-colour-context' : undefined}
              >
                {meaning.text}
              </span>
            ),
          )}
        </p>
        {focus?.partId && (
          <>
            <span className="sr-only" data-connection-control="guided-word-focus">
              Selected part of this word
            </span>
            <ArabicConnectionLayer
              containerRef={canvasRef}
              controlKey="guided-word-focus"
              partIds={[focus.partId]}
              sourceIndex={focus.sourceIndex}
              colour={mark?.colour || glyphColourFor(focus.partId)}
              measureKey={result.arabic}
            />
          </>
        )}
      </div>
      <div
        className={`arabic-guided-note ${note ? 'has-selection' : ''}`}
        aria-live="polite"
        data-guided-explanation={note?.kind}
        data-focus-source-index={focus?.sourceIndex}
      >
        {note ? (
          <>
            {mark && <ArabicGlyphCloseup result={result} sourceIndex={focus.sourceIndex} />}
            <div>
              <strong>{note.title}</strong>
              <p>{note.body}</p>
            </div>
            <button
              type="button"
              className="arabic-guided-note-close"
              aria-label="Close word explanation"
              onClick={() => setFocus(null)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </>
        ) : (
          <p>{result.study.summary}</p>
        )}
      </div>
      <div className="arabic-guided-footer">
        <button
          type="button"
          className="arabic-guided-inspect-button"
          aria-expanded={panel === 'inspect'}
          aria-controls={panel === 'inspect' ? `${id}-choices` : undefined}
          onClick={(event) => openPanel('inspect', event)}
        >
          <ScanText size={17} aria-hidden="true" />
          Look inside
        </button>
        {onBuildSentence && (
          <button
            type="button"
            className="arabic-guided-next"
            onClick={() => onBuildSentence(result.study.sentencePatch)}
          >
            Use in a sentence
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
      </div>
      {panel === 'inspect' && choiceTray}
      <span className="sr-only" role="status">
        {result.latin}. {result.translation}
      </span>
    </section>
  );
}
