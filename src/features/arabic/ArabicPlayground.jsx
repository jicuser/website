import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Layers, Network, RotateCcw, Search, Sparkles, Type } from 'lucide-react';
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
  InlineChoices,
  VOWEL_CHOICES,
  ColourLegend,
  Explanation,
  OptionButton,
  PickerButton,
} from './ArabicControls';
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

const COMMON_OWNERS = ['my', 'our', 'your_m', 'your_f', 'his', 'her'];
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
            {VOWEL_CHOICES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`arabic-vowel-option arabic-colour-${option.colour}`}
                aria-pressed={current.grammar.caseKey === option.id}
                onClick={() => onChange({ contextId: option.contextId })}
              >
                <span className="arabic-vowel-symbol" lang="ar" aria-hidden="true">
                  ـ{option.mark}
                </span>
                <strong>
                  {option.sound} <span>{option.name}</span>
                </strong>
                <span>{option.label}</span>
              </button>
            ))}
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
  const [noun, setNoun] = useState(initial.noun);
  const [verb, setVerb] = useState(initial.verb);
  const [selector, setSelector] = useState('owner');
  const [partHint, setPartHint] = useState('');
  const builderRef = useRef(null);
  const [previous, setPrevious] = useState(null);
  const [saved, setSaved] = useState(false);
  const result = useMemo(
    () => (mode === 'noun' ? buildNoun(noun) : buildVerb(verb)),
    [mode, noun, verb],
  );
  const availableParts = result.segments
    .filter((part) => part.arabic.trim() || part.latin.trim())
    .map((part) => part.id);
  const selectedPart = selector
    ? (
        {
          person: ['prefix', 'ending', 'stem'],
          tense: ['context', 'case', 'ending', 'stem'],
          owner: ['owner', 'article', 'stem'],
          number: ['number', 'owner', 'stem'],
          article: ['article', 'stem'],
          case: ['case', 'number', 'owner', 'stem'],
          context: ['context', 'case', 'stem'],
        }[selector] || [selector]
      ).find((part) => availableParts.includes(part))
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
    setPrevious(result);
    setNoun((current) => ({ ...current, ...patch }));
  };
  const changeVerb = (patch) => {
    setPrevious(result);
    setVerb((current) => ({ ...current, ...patch }));
  };
  const choosePart = (next, hint = '') => {
    setPartHint(hint);
    setSelector((current) => (current === next && !hint ? null : next));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    builderRef.current?.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };
  const changeMode = (next) => {
    setMode(next);
    setPrevious(null);
    setPartHint('');
    setSelector(next === 'noun' ? 'owner' : 'person');
  };
  const openPart = (part, detail) => {
    const hint =
      detail?.mark && ['stem', 'root'].includes(part)
        ? 'This sound belongs to the word. Choose another word to compare.'
        : '';
    if (mode === 'noun')
      choosePart(
        ['stem', 'owner', 'case', 'article', 'number', 'context'].includes(part) ? part : 'stem',
        hint,
      );
    else
      choosePart(
        part === 'stem' || part === 'root'
          ? 'stem'
          : ['subject', 'suffix', 'owner', 'person', 'prefix', 'ending'].includes(part)
            ? 'person'
            : 'tense',
        hint,
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
    setPrevious(null);
    setSelector(null);
    document
      .getElementById('arabic-workspace')
      ?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const reset = () => {
    setNoun(INITIAL_NOUN);
    setVerb(INITIAL_VERB);
    setPrevious(null);
    setMode('noun');
  };
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
              <ArabicResult
                result={result}
                previous={previous}
                onPartClick={openPart}
                selectedPart={selectedPart}
              />
              <div className="arabic-picker-row">
                {mode === 'noun' ? (
                  <>
                    <PickerButton
                      label="Word"
                      value={labelOf(NOUNS, noun.nounId)}
                      onClick={() => choosePart('stem')}
                      expanded={selector === 'stem'}
                      controlsId="arabic-word-choices"
                    />
                    <PickerButton
                      label="Whose?"
                      value={labelOf(OWNERS, noun.ownerId)}
                      colour="owner"
                      onClick={() => choosePart('owner')}
                      expanded={selector === 'owner'}
                      controlsId="arabic-word-choices"
                    />
                    <PickerButton
                      label="Beginning"
                      value={labelOf(CONTEXTS, noun.contextId)}
                      colour="context"
                      onClick={() => choosePart('context')}
                      expanded={selector === 'context'}
                      controlsId="arabic-word-choices"
                    />
                  </>
                ) : (
                  <>
                    <PickerButton
                      label="Action"
                      value={labelOf(VERBS, verb.verbId)}
                      onClick={() => choosePart('stem')}
                      expanded={selector === 'stem'}
                      controlsId="arabic-word-choices"
                    />
                    <PickerButton
                      label="Who?"
                      value={labelOf(PERSONS, verb.personId)}
                      colour="owner"
                      onClick={() => choosePart('person')}
                      expanded={selector === 'person'}
                      controlsId="arabic-word-choices"
                    />
                    <PickerButton
                      label="When?"
                      value={labelOf(TENSES, verb.tenseId)}
                      colour="context"
                      onClick={() => choosePart('tense')}
                      expanded={selector === 'tense'}
                      controlsId="arabic-word-choices"
                    />
                  </>
                )}
              </div>
              {mode === 'noun' && (
                <div className="arabic-extra-controls">
                  <button
                    type="button"
                    onClick={() => choosePart('case')}
                    className="arabic-quiet arabic-colour-case"
                    aria-expanded={selector === 'case'}
                    aria-controls={selector === 'case' ? 'arabic-word-choices' : undefined}
                  >
                    <span className="arabic-vowel-mini" lang="ar">
                      ـُ ـَ ـِ
                    </span>{' '}
                    Vowels
                  </button>
                  <button
                    type="button"
                    onClick={() => choosePart('number')}
                    className="arabic-quiet arabic-colour-number"
                    aria-expanded={selector === 'number'}
                    aria-controls={selector === 'number' ? 'arabic-word-choices' : undefined}
                  >
                    {labelOf(NUMBERS, noun.number)}
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
                </div>
              )}
              {selector &&
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
                ))}
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
