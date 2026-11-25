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
import { InlineChoices, ColourLegend, Explanation, OptionButton } from './ArabicControls';
import ArabicStructureExplorer from './ArabicStructureExplorer';
import {
  INITIAL_EXPLORER_NOUN,
  buildExplorerModel,
  isExplorerContextCompatible,
} from './arabicExplorerModel.mjs';
import ArabicChangeStory from './ArabicChangeStory';
import GrammarExplorer from './GrammarExplorer';
import PracticePanel from './PracticePanel';
import SentenceBuilder from './SentenceBuilder';

const INITIAL_NOUN = INITIAL_EXPLORER_NOUN;
const INITIAL_VERB = { verbId: 'kataba', personId: 'we', tenseId: 'past' };
const STORAGE_KEY = 'jic.arabic.builder.v2';
const TABS = [
  { id: 'build', label: 'Words', icon: Type },
  { id: 'sentences', label: 'Sentences', icon: Layers },
  { id: 'explore', label: 'Rule map', icon: Network },
  { id: 'practice', label: 'Practise', icon: Sparkles },
];
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
    if (!isExplorerContextCompatible(noun.contextId, noun.nounId)) noun.contextId = 'this';
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

function BeginningPicker({ noun, selector, onChange, onClose, familyId }) {
  const model = useMemo(() => buildExplorerModel({ mode: 'noun', noun }), [noun]);
  const currentFamily = model.families.find((family) =>
    family.options.some((option) => option.id === noun.contextId),
  );
  const [familyChoice, setFamilyChoice] = useState(familyId || currentFamily?.id || 'pointing');
  const family = model.families.find((item) => item.id === familyChoice) || model.families[0];
  return (
    <InlineChoices
      id="arabic-word-choices"
      title={selector === 'case' ? 'The beginning sets the ending' : 'Choose a beginning'}
      onClose={onClose}
      colour="context"
      className="arabic-family-choices"
    >
      <div className="arabic-family-switch" role="group" aria-label="Beginning families">
        {model.families.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={family.id === item.id}
            onClick={() => setFamilyChoice(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="arabic-family-description">{family.description}</p>
      <div className="arabic-option-grid arabic-family-options">
        {family.options.map((option) => {
          const piece = partOf(option.result, 'context');
          return (
            <OptionButton
              key={option.id}
              label={option.label}
              arabic={piece?.arabic.trim()}
              latin={piece?.latin.trim()}
              description={option.disabled ? option.reason : undefined}
              disabled={option.disabled}
              selected={noun.contextId === option.id}
              colour="context"
              onClick={() => onChange(option.patch)}
            />
          );
        })}
      </div>
      {selector === 'case' && (
        <p className="arabic-choice-hint">
          {noun.ownerId === 'my'
            ? 'With “my”, ī stays together. Try another beginning and watch the whole phrase.'
            : 'Choose the meaning first. The word’s ending follows it.'}
        </p>
      )}
      <button
        type="button"
        className="arabic-more-choices"
        aria-pressed={noun.contextId === 'phrase'}
        onClick={() => onChange({ contextId: 'phrase' })}
      >
        Just the word
      </button>
    </InlineChoices>
  );
}

function NounPicker({ noun, selector, onChange, onClose, familyId }) {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const selectedNoun = NOUNS.find((item) => item.id === noun.nounId);
  if (selector === 'context' || selector === 'case')
    return (
      <BeginningPicker
        noun={noun}
        selector={selector}
        familyId={familyId}
        onChange={onChange}
        onClose={onClose}
      />
    );
  const choices = {
    stem: { title: 'Choose a word', options: NOUNS, key: 'nounId', colour: 'stem' },
    owner: { title: 'Whose?', options: OWNERS, key: 'ownerId', colour: 'owner' },
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
  };
  const config = choices[selector] || choices.stem;
  const common = selector === 'stem' ? NOUNS.slice(0, 6).map((item) => item.id) : COMMON_OWNERS;
  const hasMore = ['stem', 'owner'].includes(selector);
  const filtered = config.options.filter((option) => {
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
      <div className={`arabic-option-grid ${selector === 'stem' ? 'is-vocabulary' : ''}`}>
        {filtered.map((option) => {
          const patch = { [config.key]: option.id };
          if (
            selector === 'stem' &&
            !getAvailableNumbers(option.id).some((item) => item.id === noun.number)
          )
            patch.number = 'singular';
          const needsBeginningChange =
            selector === 'stem' && !isExplorerContextCompatible(noun.contextId, option.id);
          if (needsBeginningChange) patch.contextId = 'this';
          if (selector === 'article') patch.ownerId = 'none';
          const example = buildNoun({ ...noun, ...patch });
          const piece = partOf(example, 'owner');
          const arabic =
            selector === 'stem'
              ? option.arabic
              : selector === 'owner'
                ? piece?.arabic.trim()
                : selector === 'article' && option.id === 'definite'
                  ? 'الـ'
                  : '';
          const latin =
            selector === 'stem'
              ? option.latin
              : selector === 'owner'
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
              description={
                needsBeginningChange
                  ? `Starts with “${partOf(example, 'context')?.label || 'this'}…”`
                  : undefined
              }
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
        <p className="arabic-choice-hint">Available forms of {selectedNoun.label.toLowerCase()}.</p>
      )}
    </InlineChoices>
  );
}

function VerbPicker({ verb, selector, onChange, onClose }) {
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
  const [selector, setSelector] = useState(null);
  const [selectionDetail, setSelectionDetail] = useState(null);
  const builderRef = useRef(null);
  const [previous, setPrevious] = useState(null);
  const [undoChoice, setUndoChoice] = useState(null);
  const [saved, setSaved] = useState(false);
  const result = useMemo(
    () => (mode === 'noun' ? buildNoun(noun) : buildVerb(verb)),
    [mode, noun, verb],
  );
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
  const choosePart = (next, detail = {}) => {
    setSelector(next);
    setSelectionDetail(detail);
  };
  const changeMode = (next) => {
    setMode(next);
    setPrevious(null);
    setUndoChoice(null);
    setSelector(null);
    setSelectionDetail(null);
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
    setSelectionDetail(null);
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
    setSelector(null);
    setSelectionDetail(null);
  };
  const undo = () => {
    if (!undoChoice) return;
    setPrevious(result);
    if (undoChoice.mode === 'noun') setNoun(undoChoice.choices);
    else setVerb(undoChoice.choices);
    setMode(undoChoice.mode);
    setUndoChoice(null);
    builderRef.current
      ?.querySelector('[data-structure-node][aria-expanded="true"], [data-structure-node]')
      ?.focus();
  };
  const choiceTray =
    selector &&
    (mode === 'noun' ? (
      <NounPicker
        key={`noun-${selector}`}
        noun={noun}
        selector={selector}
        familyId={selectionDetail?.familyId}
        onChange={changeNoun}
        onClose={() => setSelector(null)}
      />
    ) : (
      <VerbPicker
        key={`verb-${selector}`}
        verb={verb}
        selector={selector}
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
              <div className="arabic-structure-toolbar">
                <span>One sentence. Follow its parts.</span>
                {undoChoice && (
                  <button type="button" className="arabic-quiet" onClick={undo}>
                    <Undo2 size={16} aria-hidden="true" /> Undo
                  </button>
                )}
              </div>
              <ArabicStructureExplorer
                mode={mode}
                noun={noun}
                verb={verb}
                result={result}
                previous={previous}
                selector={selector}
                onSelect={choosePart}
              >
                {choiceTray}
              </ArabicStructureExplorer>
              {previous &&
                (previous.arabic !== result.arabic ||
                  previous.translation !== result.translation) && (
                  <details className="arabic-change-disclosure">
                    <summary>See last change</summary>
                    <ArabicChangeStory previous={previous} result={result} />
                  </details>
                )}
            </div>
            <ColourLegend />
            <Explanation result={result} previous={previous} title="More about this sentence" />
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
