import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Layers,
  Network,
  RotateCcw,
  Search,
  Sparkles,
  Type,
  Undo2,
} from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import { visibleNavigation } from '@/lib/pageVisibility';
import {
  NOUNS,
  OWNERS,
  CONTEXTS,
  NUMBERS,
  DEFINITENESS,
  VERBS,
  PERSONS,
  TENSES,
  buildNoun,
  buildVerb,
  getAvailableNumbers,
} from './grammar.mjs';
import {
  ArabicResult,
  ArabicGlyphCloseup,
  InlineChoices,
  VOWEL_CHOICES,
  ColourLegend,
  Explanation,
  OptionButton,
} from './ArabicControls';
import ArabicWordMap from './ArabicWordMap';
import ArabicChangeStory from './ArabicChangeStory';
import GrammarExplorer from './GrammarExplorer';
import PracticePanel from './PracticePanel';
import SentenceBuilder from './SentenceBuilder';

const INITIAL_NOUN = {
  nounId: 'bayt',
  ownerId: 'our',
  contextId: 'this',
  number: 'singular',
  definiteness: 'indefinite',
};
const INITIAL_VERB = { verbId: 'kataba', personId: 'we', tenseId: 'past' };
const STORAGE_KEY = 'jic.arabic.builder.v1';
const TABS = [
  { id: 'build', label: 'Words', icon: Type },
  { id: 'sentences', label: 'Sentences', icon: Layers },
  { id: 'explore', label: 'Rule map', icon: Network },
  { id: 'practice', label: 'Practise', icon: Sparkles },
];
const labelOf = (options, id) => options.find((item) => item.id === id)?.label || id;
const isKnown = (options, value) => options.some((option) => option.id === value);

function loadChoices() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== 'object') return { noun: INITIAL_NOUN, verb: INITIAL_VERB };
    const noun = { ...INITIAL_NOUN };
    const verb = { ...INITIAL_VERB };
    for (const [key, options] of [
      ['nounId', NOUNS],
      ['ownerId', OWNERS],
      ['contextId', CONTEXTS],
      ['number', NUMBERS],
      ['definiteness', DEFINITENESS],
    ])
      if (isKnown(options, stored.noun?.[key])) noun[key] = stored.noun[key];
    if (!getAvailableNumbers(noun.nounId).some((option) => option.id === noun.number))
      noun.number = 'singular';
    for (const [key, options] of [
      ['verbId', VERBS],
      ['personId', PERSONS],
      ['tenseId', TENSES],
    ])
      if (isKnown(options, stored.verb?.[key])) verb[key] = stored.verb[key];
    return { noun, verb };
  } catch {
    return { noun: INITIAL_NOUN, verb: INITIAL_VERB };
  }
}

const COMMON_OWNERS = ['my', 'our', 'his', 'her'];
const COMMON_PEOPLE = ['i', 'we', 'you_m', 'you_f', 'he', 'she'];
const shortOwner = (option) =>
  ({ your_m: 'Your · man', your_f: 'Your · woman' })[option.id] || option.label;
const partOf = (result, id) => result.segments.find((part) => part.id === id);
const tokenArabic = (value = '') => (/^[\u064b-\u0652]/u.test(value) ? `ـ${value}` : value);

function NounPicker({ noun, selector, onChange, onClose, hint }) {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const selectedNoun = NOUNS.find((item) => item.id === noun.nounId);
  const choices = {
    stem: { title: 'Choose a word', options: NOUNS, key: 'nounId', colour: 'stem' },
    owner: { title: 'Whose?', options: OWNERS, key: 'ownerId', colour: 'owner' },
    context: { title: 'Start with…', options: CONTEXTS, key: 'contextId', colour: 'context' },
    article: {
      title: 'A, the, or my?',
      options: DEFINITENESS,
      key: 'definiteness',
      colour: 'context',
    },
    number: {
      title: 'How many?',
      options: getAvailableNumbers(noun.nounId),
      key: 'number',
      colour: 'number',
    },
    case: { title: 'Try a vowel', colour: 'case' },
  };
  const config = choices[selector] || choices.stem;
  const current = buildNoun(noun);
  const common = selector === 'stem' ? NOUNS.slice(0, 6).map((item) => item.id) : COMMON_OWNERS;
  const hasMore = ['stem', 'owner'].includes(selector);
  const filtered = (config.options || []).filter((option) => {
    if (!all && !query && hasMore && !common.includes(option.id) && noun[config.key] !== option.id)
      return false;
    return `${option.label} ${option.english || ''} ${option.arabic || ''} ${option.latin || ''} ${option.root || ''}`
      .toLowerCase()
      .includes(query.toLowerCase().trim());
  });
  return (
    <InlineChoices
      id="arabic-word-choices"
      title={config.title}
      description={hint}
      onClose={onClose}
      colour={config.colour}
    >
      {selector === 'stem' && (
        <label className="arabic-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Find an Arabic word"
            placeholder="Find a word"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
      {selector === 'case' ? (
        <>
          <div className="arabic-vowel-options" role="group" aria-label="Compare vowel positions">
            {VOWEL_CHOICES.map((option) => {
              const example = buildNoun({ ...noun, contextId: option.contextId });
              const hasCaseMark = example.segments.some((part) => part.id === 'case');
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`arabic-vowel-option arabic-colour-${option.colour}`}
                  aria-pressed={current.grammar.caseKey === option.id}
                  onClick={() => onChange({ contextId: option.contextId })}
                >
                  {hasCaseMark ? (
                    <span className="arabic-vowel-symbol" aria-hidden="true">
                      <ArabicGlyphCloseup result={example} partId="case" />
                    </span>
                  ) : (
                    <span className="arabic-vowel-word" lang="ar" dir="rtl">
                      {example.segments
                        .filter((part) => part.id !== 'context')
                        .map((part) => part.arabic)
                        .join('')}
                    </span>
                  )}
                  <strong>
                    {option.sound} <span>{option.name}</span>
                  </strong>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="arabic-choice-hint">
            {noun.ownerId === 'my'
              ? '“My” keeps ī. The surrounding words still change.'
              : noun.number !== 'singular'
                ? 'This form has its own ending. Watch the complete word.'
                : 'The beginning changes too, so the sentence still makes sense.'}
          </p>
        </>
      ) : (
        <>
          <div className={`arabic-option-grid ${selector === 'stem' ? 'is-vocabulary' : ''}`}>
            {filtered.map((option) => {
              const patch = { [config.key]: option.id };
              if (
                selector === 'stem' &&
                !getAvailableNumbers(option.id).some((item) => item.id === noun.number)
              )
                patch.number = 'singular';
              if (selector === 'article') patch.ownerId = 'none';
              const example = buildNoun({ ...noun, ...patch });
              const piece = partOf(example, selector === 'context' ? 'context' : 'owner');
              const arabic =
                selector === 'stem'
                  ? option.arabic
                  : selector === 'owner' || selector === 'context'
                    ? piece?.arabic.trim()
                    : selector === 'article' && option.id === 'definite'
                      ? 'الـ'
                      : '';
              const latin =
                selector === 'stem'
                  ? option.latin
                  : selector === 'owner' || selector === 'context'
                    ? piece?.latin.trim()
                    : selector === 'article' && option.id === 'definite'
                      ? 'al-'
                      : '';
              return (
                <OptionButton
                  key={option.id}
                  label={selector === 'owner' ? shortOwner(option) : option.label}
                  arabic={tokenArabic(arabic)}
                  latin={latin}
                  selected={
                    selector === 'article'
                      ? noun.ownerId === 'none' && noun[config.key] === option.id
                      : noun[config.key] === option.id
                  }
                  colour={config.colour}
                  onClick={() => onChange(patch)}
                />
              );
            })}
          </div>
          {!filtered.length && (
            <p className="arabic-empty">No match yet. Try “house”, “book” or “school”.</p>
          )}
          {hasMore && !query && (
            <button
              type="button"
              className="arabic-more-choices"
              aria-pressed={all}
              onClick={() => setAll(!all)}
            >
              {all
                ? 'Common choices'
                : selector === 'stem'
                  ? `All ${NOUNS.length} words`
                  : 'More people & no owner'}
            </button>
          )}
          {selector === 'article' && (
            <button
              type="button"
              className="arabic-more-choices"
              onClick={() => onChange({ ownerId: 'my' })}
            >
              Use my
            </button>
          )}
          {selector === 'owner' && (
            <p className="arabic-choice-hint">The ending shows belonging or connection.</p>
          )}
          {selector === 'number' && selectedNoun && (
            <p className="arabic-choice-hint">
              Available forms of {selectedNoun.label.toLowerCase()}.
            </p>
          )}
        </>
      )}
    </InlineChoices>
  );
}

function VerbPicker({ verb, selector, onChange, onClose, hint }) {
  const [all, setAll] = useState(false);
  const config =
    selector === 'stem'
      ? { title: 'Choose an action', options: VERBS, key: 'verbId', colour: 'stem' }
      : selector === 'person'
        ? { title: 'Who?', options: PERSONS, key: 'personId', colour: 'owner' }
        : { title: 'When?', options: TENSES, key: 'tenseId', colour: 'context' };
  const options = config.options.filter(
    (option) =>
      selector !== 'person' ||
      all ||
      COMMON_PEOPLE.includes(option.id) ||
      option.id === verb.personId,
  );
  return (
    <InlineChoices
      id="arabic-word-choices"
      title={config.title}
      description={hint}
      onClose={onClose}
      colour={config.colour}
    >
      <div className="arabic-option-grid">
        {options.map((option) => {
          const example = buildVerb({ ...verb, [config.key]: option.id });
          return (
            <OptionButton
              key={option.id}
              label={option.label}
              arabic={
                selector === 'person'
                  ? option.arabic
                  : selector === 'stem'
                    ? option.arabic
                    : example.arabic
              }
              latin={
                selector === 'stem'
                  ? option.latin
                  : selector === 'person'
                    ? undefined
                    : example.latin
              }
              selected={verb[config.key] === option.id}
              colour={config.colour}
              onClick={() => onChange({ [config.key]: option.id })}
            />
          );
        })}
      </div>
      {selector === 'person' && (
        <button
          type="button"
          className="arabic-more-choices"
          aria-pressed={all}
          onClick={() => setAll(!all)}
        >
          {all ? 'Common choices' : 'More people'}
        </button>
      )}
      <p className="arabic-choice-hint">Watch the beginning and ending change together.</p>
    </InlineChoices>
  );
}

export default function ArabicPlayground() {
  const { getContent } = useContent();
  const learningSection = visibleNavigation(PUBLIC_MENU_GROUPS, getContent).find((group) =>
    group.children.some((page) => page.path === '/learning/arabic'),
  );
  const [initial] = useState(loadChoices);
  const [tab, setTab] = useState('build');
  const [mode, setMode] = useState('noun');
  const [wordView, setWordView] = useState('build');
  const [noun, setNoun] = useState(initial.noun);
  const [verb, setVerb] = useState(initial.verb);
  const [selector, setSelector] = useState('owner');
  const [partHint, setPartHint] = useState('');
  const builderRef = useRef(null);
  const viewButtons = useRef({});
  const [previous, setPrevious] = useState(null);
  const [undoChoice, setUndoChoice] = useState(null);
  const [saved, setSaved] = useState(false);
  const result = useMemo(
    () => (mode === 'noun' ? buildNoun(noun) : buildVerb(verb)),
    [mode, noun, verb],
  );
  const availableParts = result.segments
    .filter((part) => part.arabic.trim() || part.latin.trim())
    .map((part) => part.id);
  const countJoinsMy =
    noun.ownerId === 'my' &&
    (noun.number === 'dual' ||
      (noun.number === 'plural' &&
        NOUNS.find((item) => item.id === noun.nounId)?.plural?.type === 'sound_m'));
  const selectedPart = selector
    ? (
        {
          person: ['prefix', 'ending', 'stem'],
          tense: ['context', 'case', 'stem'],
          owner: ['owner'],
          number: ['number', ...(countJoinsMy ? ['owner'] : []), 'stem'],
          article: ['article'],
          case: ['case'],
          context: ['context'],
        }[selector] || [selector]
      ).find((part) => availableParts.includes(part)) || selector
    : undefined;
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ noun, verb }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [noun, verb]);
  const changeNoun = (patch) => {
    if (Object.entries(patch).every(([key, value]) => noun[key] === value)) return;
    setUndoChoice({ mode: 'noun', choices: noun });
    setPrevious(result);
    setNoun((current) => ({ ...current, ...patch }));
  };
  const changeVerb = (patch) => {
    if (Object.entries(patch).every(([key, value]) => verb[key] === value)) return;
    setUndoChoice({ mode: 'verb', choices: verb });
    setPrevious(result);
    setVerb((current) => ({ ...current, ...patch }));
  };
  const choosePart = (next, hint = '', forceOpen = false) => {
    setPartHint(hint);
    setSelector((current) => (current === next && !hint && !forceOpen ? null : next));
  };
  const changeMode = (next) => {
    setMode(next);
    setPrevious(null);
    setUndoChoice(null);
    setPartHint('');
    setSelector(next === 'noun' ? 'owner' : 'person');
  };
  const openPart = (part, detail) => {
    const meaningPart = detail?.meaningId || part;
    const hint =
      detail?.mark && ['stem', 'root'].includes(part)
        ? 'This sound belongs to the word. Choose another word to compare.'
        : '';
    if (mode === 'noun')
      choosePart(
        ['stem', 'owner', 'case', 'article', 'number', 'context'].includes(meaningPart)
          ? meaningPart
          : 'stem',
        hint,
        Boolean(detail?.mark),
      );
    else
      choosePart(
        part === 'stem' || part === 'root'
          ? 'stem'
          : ['subject', 'suffix', 'owner', 'person', 'prefix', 'ending'].includes(part)
            ? 'person'
            : 'tense',
        hint,
        Boolean(detail?.mark),
      );
  };
  const tryExample = (example) => {
    if (example.mode === 'verb') {
      setVerb({ ...INITIAL_VERB, ...example });
      setMode('verb');
    } else {
      setNoun({ ...INITIAL_NOUN, ...example });
      setMode('noun');
    }
    setTab('build');
    setWordView('build');
    setPrevious(null);
    setUndoChoice(null);
    setSelector(null);
    document
      .getElementById('arabic-workspace')
      ?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const reset = () => {
    setNoun(INITIAL_NOUN);
    setVerb(INITIAL_VERB);
    setPrevious(null);
    setUndoChoice(null);
    setMode('noun');
    setWordView('build');
    setSelector('owner');
    setPartHint('');
  };
  const undo = () => {
    if (!undoChoice) return;
    setPrevious(result);
    if (undoChoice.mode === 'noun') setNoun(undoChoice.choices);
    else setVerb(undoChoice.choices);
    setMode(undoChoice.mode);
    setUndoChoice(null);
    viewButtons.current[wordView]?.focus();
  };
  const steps =
    mode === 'noun'
      ? [
          { id: 'stem', label: 'Word', colour: 'stem', action: 'choose a word' },
          { id: 'owner', label: 'Whose?', colour: 'owner', action: 'choose whose' },
          { id: 'context', label: 'Phrase', colour: 'context', action: 'choose a phrase' },
        ]
      : [
          { id: 'stem', label: 'Action', colour: 'stem', action: 'choose an action' },
          { id: 'person', label: 'Who?', colour: 'owner', action: 'choose who' },
          { id: 'tense', label: 'When?', colour: 'context', action: 'choose when' },
        ];
  const controlLabels =
    mode === 'noun'
      ? {
          stem: `Change word: ${labelOf(NOUNS, noun.nounId)}`,
          owner: `Change whose?: ${labelOf(OWNERS, noun.ownerId)}`,
          context: `Change beginning: ${labelOf(CONTEXTS, noun.contextId)}`,
          case: 'Change ending sound',
          number: `Change how many?: ${labelOf(NUMBERS, noun.number)}`,
          article: 'Change a, the or my',
        }
      : {
          stem: `Change action: ${labelOf(VERBS, verb.verbId)}`,
          person: `Change who?: ${labelOf(PERSONS, verb.personId)}`,
          prefix: `Change who?: ${labelOf(PERSONS, verb.personId)}`,
          ending: `Change who?: ${labelOf(PERSONS, verb.personId)}`,
          context: `Change when?: ${labelOf(TENSES, verb.tenseId)}`,
          case: 'Change verb ending sound',
        };
  const choiceTray =
    selector &&
    (mode === 'noun' ? (
      <NounPicker
        key={`noun-${selector}`}
        noun={noun}
        selector={selector}
        hint={partHint}
        onChange={changeNoun}
        onClose={() => setSelector(null)}
      />
    ) : (
      <VerbPicker
        key={`verb-${selector}`}
        verb={verb}
        selector={selector}
        hint={partHint}
        onChange={changeVerb}
        onClose={() => setSelector(null)}
      />
    ));
  return (
    <section className="arabic-app page-transition" aria-labelledby="arabic-page-title">
      <header className="arabic-page-header">
        <div>
          {learningSection && (
            <Link to={learningSection.path} className="arabic-eyebrow">
              {learningSection.name}
            </Link>
          )}
          <h1 id="arabic-page-title">
            Learn Arabic{' '}
            <span lang="ar" dir="rtl">
              تَعَلَّمِ الْعَرَبِيَّةَ
            </span>
          </h1>
          <p>Tap. Change. Understand.</p>
        </div>
        <span className="arabic-level">Fuṣḥā · Start anywhere</span>
      </header>
      <nav className="arabic-tabs" aria-label="Arabic learning tools">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            className={tab === id ? 'is-active' : ''}
            onClick={() => {
              setTab(id);
              setSelector(null);
            }}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div id="arabic-workspace" className="arabic-workspace">
        {tab === 'build' && (
          <>
            <div className="arabic-workspace-heading">
              <div
                className="arabic-mode-switch"
                role="group"
                aria-label="Build a thing or an action"
              >
                <button
                  type="button"
                  onClick={() => changeMode('noun')}
                  aria-pressed={mode === 'noun'}
                >
                  A thing <span>house, book…</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeMode('verb')}
                  aria-pressed={mode === 'verb'}
                >
                  An action <span>write, learn…</span>
                </button>
              </div>
              <button
                type="button"
                className="arabic-quiet arabic-reset"
                onClick={reset}
                aria-label="Start again"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>Start again</span>
              </button>
            </div>
            <div
              ref={builderRef}
              className={`arabic-panel arabic-builder ${selector ? 'has-choices' : ''}`}
            >
              <div className="arabic-build-toolbar">
                <div className="arabic-view-switch" role="group" aria-label="Word view">
                  <button
                    type="button"
                    ref={(element) => {
                      viewButtons.current.build = element;
                    }}
                    aria-pressed={wordView === 'build'}
                    onClick={() => setWordView('build')}
                  >
                    <Type size={16} aria-hidden="true" /> Build
                  </button>
                  <button
                    type="button"
                    ref={(element) => {
                      viewButtons.current.map = element;
                    }}
                    aria-pressed={wordView === 'map'}
                    onClick={() => setWordView('map')}
                  >
                    <Network size={16} aria-hidden="true" /> Map
                  </button>
                </div>
                {undoChoice && (
                  <button type="button" className="arabic-quiet" onClick={undo}>
                    <Undo2 size={16} aria-hidden="true" /> Undo
                  </button>
                )}
              </div>
              {wordView === 'build' ? (
                <>
                  <div
                    className="arabic-build-steps"
                    role="group"
                    aria-label="Steps to build a phrase"
                  >
                    {steps.map((step, index) => (
                      <button
                        type="button"
                        key={step.id}
                        className={`arabic-build-step arabic-colour-${step.colour}`}
                        aria-label={`Step ${index + 1}: ${step.action}`}
                        aria-expanded={selector === step.id}
                        aria-controls={selector === step.id ? 'arabic-word-choices' : undefined}
                        onClick={() => choosePart(step.id)}
                      >
                        <span className="arabic-step-number" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span>{step.label}</span>
                      </button>
                    ))}
                  </div>
                  <ArabicResult
                    result={result}
                    previous={previous}
                    onPartClick={openPart}
                    selectedPart={selectedPart}
                    selectedMeaningId={
                      mode === 'noun'
                        ? selector
                        : selector === 'person'
                          ? result.englishParts.find((part) =>
                              ['prefix', 'ending'].includes(part.id),
                            )?.id
                          : selector === 'stem'
                            ? 'stem'
                            : 'context'
                    }
                    controlLabels={controlLabels}
                    choiceControlsId="arabic-word-choices"
                    meaningTargets={
                      mode === 'noun' && noun.number === 'dual' && noun.ownerId === 'my'
                        ? { number: 'owner' }
                        : undefined
                    }
                  />
                  {mode === 'noun' && (
                    <details className="arabic-more-ways">
                      <summary>More ways</summary>
                      <div className="arabic-extra-controls">
                        <button
                          type="button"
                          onClick={() => choosePart('number')}
                          className="arabic-quiet arabic-colour-number"
                          aria-label={`Change how many: ${labelOf(NUMBERS, noun.number)}`}
                          aria-expanded={selector === 'number'}
                          aria-controls={selector === 'number' ? 'arabic-word-choices' : undefined}
                        >
                          How many? · {labelOf(NUMBERS, noun.number)}
                        </button>
                        <button
                          type="button"
                          onClick={() => choosePart('article')}
                          className="arabic-quiet"
                          aria-expanded={selector === 'article'}
                          aria-controls={selector === 'article' ? 'arabic-word-choices' : undefined}
                        >
                          A / the / my
                        </button>
                        {!availableParts.includes('case') && (
                          <button
                            type="button"
                            onClick={() => choosePart('case')}
                            className="arabic-quiet arabic-colour-case"
                            aria-expanded={selector === 'case'}
                            aria-controls={selector === 'case' ? 'arabic-word-choices' : undefined}
                          >
                            Compare ending sounds
                          </button>
                        )}
                      </div>
                    </details>
                  )}
                  {choiceTray}
                </>
              ) : (
                <ArabicWordMap
                  mode={mode}
                  noun={noun}
                  verb={verb}
                  result={result}
                  selector={selector}
                  onSelect={choosePart}
                  onBack={() => {
                    setWordView('build');
                    viewButtons.current.build?.focus();
                  }}
                >
                  {choiceTray}
                </ArabicWordMap>
              )}
              <ArabicChangeStory previous={previous} result={result} />
            </div>
            <ColourLegend />
            <Explanation result={result} previous={previous} />
            <div className="arabic-next">
              <div>
                <strong>Try one small change</strong>
                <p>
                  {mode === 'noun'
                    ? 'Try “his house”, then “in his house”.'
                    : 'Try “he writes”, then change he to we.'}
                </p>
              </div>
              <button
                type="button"
                className="arabic-primary"
                onClick={() =>
                  tryExample(
                    mode === 'noun'
                      ? { mode: 'noun', nounId: 'bayt', ownerId: 'his', contextId: 'this' }
                      : { mode: 'verb', verbId: 'kataba', personId: 'he', tenseId: 'present' },
                  )
                }
              >
                Try it
              </button>
            </div>
          </>
        )}
        <div hidden={tab !== 'sentences'}>
          <SentenceBuilder />
        </div>
        <div hidden={tab !== 'explore'}>
          <GrammarExplorer onTryExample={tryExample} />
        </div>
        <div hidden={tab !== 'practice'}>
          <PracticePanel />
        </div>
      </div>
      <footer className="arabic-learning-footer">
        <p>
          <Check size={15} aria-hidden="true" />
          {saved
            ? 'Your word choices stay on this device.'
            : 'Your choices work for this visit. Device saving is unavailable.'}
        </p>
        <Link to="/" className="arabic-back-home">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to JIC
        </Link>
        <Link to="/worship/quran">
          <BookOpen size={16} aria-hidden="true" />
          Read the Qur’an
        </Link>
        <details className="arabic-details">
          <summary>About this playground</summary>
          <p>
            Explore shared foundations of Classical and Modern Standard Arabic through a checked
            word collection and guided sentence patterns. It is a learning tool, not a free-text
            translator. Written examples keep the learning vowels visible; a device voice may
            pronounce endings differently.
          </p>
          <p>
            Practice examples are newly written. They are not Qur’anic verses. Open the existing
            Qur’an reader to read the original text. Dictionary and grammar references are in the
            Rule map.
          </p>
        </details>
      </footer>
    </section>
  );
}
