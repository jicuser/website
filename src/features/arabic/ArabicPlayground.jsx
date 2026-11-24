import React, { useEffect, useMemo, useState } from 'react';
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
  ChoiceDialog,
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

function NounPicker({ noun, selector, onChange, onClose }) {
  const [query, setQuery] = useState('');
  const selectedNoun = NOUNS.find((item) => item.id === noun.nounId);
  const choices = {
    stem: {
      title: 'What are we talking about?',
      description: 'Choose a familiar word. All of its pieces will update together.',
      options: NOUNS,
      key: 'nounId',
      colour: 'stem',
    },
    owner: {
      title: 'Whose — or connected to whom?',
      description:
        'This can mean belonging, family or connection. It does not have to mean literal ownership.',
      options: OWNERS,
      key: 'ownerId',
      colour: 'owner',
    },
    context: {
      title: 'What do you want to say?',
      description: 'The beginning helps the word choose the right ending.',
      options: CONTEXTS,
      key: 'contextId',
      colour: 'context',
    },
    article: {
      title: 'A thing, the thing, or someone’s?',
      description:
        'An owner already makes the word specific. Arabic does not add “the” before “my house”.',
      options: DEFINITENESS,
      key: 'definiteness',
      colour: 'context',
    },
    number: {
      title: 'How many?',
      description: 'Two has its own form in Arabic. Plurals can change inside the word too.',
      options: getAvailableNumbers(noun.nounId),
      key: 'number',
      colour: 'number',
    },
    case: {
      title: 'What can this vowel do?',
      description:
        'These sounds show how a regular noun fits. Choose an example and the surrounding words change with it.',
      colour: 'case',
    },
  };
  const config = choices[selector] || choices.stem;
  const current = buildNoun(noun);
  const partNote =
    selector === 'owner'
      ? current.notes.find((note) => /owner stays|My keeps|My merges|Two and my/.test(note.title))
      : selector === 'case'
        ? current.notes[0]
        : null;
  const resultFor = (patch) => buildNoun({ ...noun, ...patch });
  const choose = (patch) => {
    onChange(patch);
    onClose();
  };
  const filtered = (config.options || []).filter((option) =>
    `${option.label} ${option.english || ''} ${option.arabic || ''} ${option.latin || ''} ${option.root || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <ChoiceDialog title={config.title} description={config.description} onClose={onClose}>
      {partNote && (
        <div className="arabic-choice-explanation">
          <strong>{partNote.title}</strong>
          <p>{partNote.body}</p>
        </div>
      )}
      {selector === 'stem' && selectedNoun.root && (
        <p className="arabic-choice-root">
          {selectedNoun.label} · word-family letters{' '}
          <span lang="ar" dir="rtl">
            {selectedNoun.root}
          </span>
        </p>
      )}
      {selector === 'stem' && (
        <label className="arabic-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Find an Arabic word"
            placeholder="Find a word, e.g. book"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
      {selector === 'case' ? (
        <>
          <div className="arabic-option-grid">
            {[
              {
                id: 'u',
                contextId: 'this',
                label: 'u · This is…',
                description: 'Name or identify something.',
              },
              {
                id: 'a',
                contextId: 'saw',
                label: 'a · I saw…',
                description: 'The thing that I saw.',
              },
              { id: 'i', contextId: 'in', label: 'i · In…', description: 'A place after “in”.' },
            ].map((option) => {
              const example = resultFor({ contextId: option.contextId });
              return (
                <OptionButton
                  key={option.id}
                  label={option.label}
                  arabic={example.arabic}
                  latin={example.latin}
                  description={`${example.translation}. ${option.description}`}
                  selected={buildNoun(noun).grammar.caseKey === option.id}
                  colour="case"
                  onClick={() => choose({ contextId: option.contextId })}
                />
              );
            })}
          </div>
          <p className="arabic-helper">
            Watch the full example. “My”, two things and some plurals have their own endings, so you
            will not always see a separate u, a or i.
          </p>
        </>
      ) : (
        <>
          <div className={`arabic-option-grid ${selector === 'stem' ? 'is-vocabulary' : ''}`}>
            {filtered.map((option) => {
              let patch = { [config.key]: option.id };
              if (
                selector === 'stem' &&
                !getAvailableNumbers(option.id).some((item) => item.id === noun.number)
              )
                patch.number = 'singular';
              if (selector === 'article') patch.ownerId = 'none';
              const example = resultFor(patch);
              return (
                <OptionButton
                  key={option.id}
                  label={option.label}
                  arabic={selector === 'stem' ? option.arabic : example.arabic}
                  latin={selector === 'stem' ? option.latin : example.latin}
                  description={
                    selector === 'stem' ? option.category || option.english : example.translation
                  }
                  selected={
                    selector === 'article'
                      ? noun.ownerId === 'none' && noun[config.key] === option.id
                      : noun[config.key] === option.id
                  }
                  colour={config.colour}
                  onClick={() => choose(patch)}
                />
              );
            })}
          </div>
          {!filtered.length && (
            <p className="arabic-empty">
              No match in this word collection. Try an English word such as house, book or school.
            </p>
          )}
          {selector === 'article' && (
            <button
              type="button"
              className="arabic-quiet"
              onClick={() => choose({ ownerId: 'my' })}
            >
              Use “my” instead
            </button>
          )}
          {selector === 'stem' && (
            <p className="arabic-helper">
              {NOUNS.length} words with checked forms. A word’s plural is stored individually, not
              guessed from its spelling.
            </p>
          )}
          {selector === 'number' && selectedNoun && (
            <p className="arabic-helper">
              Only forms supported for {selectedNoun.label.toLowerCase()} appear here.
            </p>
          )}
        </>
      )}
    </ChoiceDialog>
  );
}

function VerbPicker({ verb, selector, onChange, onClose }) {
  const current = buildVerb(verb);
  const config =
    selector === 'stem'
      ? { title: 'What happens?', options: VERBS, key: 'verbId', colour: 'stem' }
      : selector === 'person'
        ? { title: 'Who is doing it?', options: PERSONS, key: 'personId', colour: 'owner' }
        : {
            title:
              selector === 'ending' ? 'What does this ending do?' : 'When — and does it happen?',
            options: TENSES,
            key: 'tenseId',
            colour: 'context',
          };
  return (
    <ChoiceDialog
      title={config.title}
      description={
        selector === 'ending'
          ? current.segments.find((part) => part.id === 'case')?.meaning
          : 'The beginning, middle and ending work together. Each choice shows a complete example.'
      }
      onClose={onClose}
    >
      {selector === 'stem' && (
        <div className="arabic-choice-explanation">
          <strong>Look inside the action</strong>
          <p>
            {current.notes.find((note) => note.title.includes('middle sound'))?.body ||
              'Each verb has its own learned pattern. Choose an action to compare the sounds.'}
          </p>
          <p className="arabic-choice-root">
            Word-family letters{' '}
            <span lang="ar" dir="rtl">
              {current.grammar.root}
            </span>
          </p>
        </div>
      )}
      <div className="arabic-option-grid">
        {config.options.map((option) => {
          const example = buildVerb({ ...verb, [config.key]: option.id });
          return (
            <OptionButton
              key={option.id}
              label={option.label}
              arabic={example.arabic}
              latin={example.latin}
              description={example.translation}
              selected={verb[config.key] === option.id}
              colour={config.colour}
              onClick={() => {
                onChange({ [config.key]: option.id });
                onClose();
              }}
            />
          );
        })}
      </div>
      <p className="arabic-helper">
        These are active forms of {VERBS.length} selected verbs. Verbs with weak or doubled roots
        need additional patterns.
      </p>
    </ChoiceDialog>
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
  const [previous, setPrevious] = useState(null);
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
    setPrevious(result);
    setNoun((current) => ({ ...current, ...patch }));
  };
  const changeVerb = (patch) => {
    setPrevious(result);
    setVerb((current) => ({ ...current, ...patch }));
  };
  const changeMode = (next) => {
    setMode(next);
    setPrevious(null);
    setSelector(null);
  };
  const openPart = (part) => {
    if (mode === 'noun')
      setSelector(
        ['stem', 'owner', 'case', 'article', 'number', 'context'].includes(part) ? part : 'stem',
      );
    else
      setSelector(
        part === 'stem' || part === 'root'
          ? 'stem'
          : ['subject', 'suffix', 'owner', 'person', 'prefix', 'ending'].includes(part)
            ? 'person'
            : part === 'case'
              ? 'ending'
              : 'tense',
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
          <p>Build a thought. Tap a piece. See why it changes.</p>
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
            <div className="arabic-panel arabic-builder">
              <div className="arabic-picker-row">
                {mode === 'noun' ? (
                  <>
                    <PickerButton
                      label="Word"
                      value={labelOf(NOUNS, noun.nounId)}
                      onClick={() => setSelector('stem')}
                    />
                    <PickerButton
                      label="Whose?"
                      value={labelOf(OWNERS, noun.ownerId)}
                      colour="owner"
                      onClick={() => setSelector('owner')}
                    />
                    <PickerButton
                      label="Say it with…"
                      value={labelOf(CONTEXTS, noun.contextId)}
                      colour="context"
                      onClick={() => setSelector('context')}
                    />
                  </>
                ) : (
                  <>
                    <PickerButton
                      label="Action"
                      value={labelOf(VERBS, verb.verbId)}
                      onClick={() => setSelector('stem')}
                    />
                    <PickerButton
                      label="Who?"
                      value={labelOf(PERSONS, verb.personId)}
                      colour="owner"
                      onClick={() => setSelector('person')}
                    />
                    <PickerButton
                      label="When?"
                      value={labelOf(TENSES, verb.tenseId)}
                      colour="context"
                      onClick={() => setSelector('tense')}
                    />
                  </>
                )}
              </div>
              <ArabicResult result={result} previous={previous} onPartClick={openPart} />
              {mode === 'noun' && (
                <div className="arabic-extra-controls">
                  <button
                    type="button"
                    onClick={() => setSelector('number')}
                    className="arabic-quiet arabic-colour-number"
                  >
                    {labelOf(NUMBERS, noun.number)} <span>· change how many</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelector('article')}
                    className="arabic-quiet"
                  >
                    {noun.ownerId === 'none'
                      ? labelOf(DEFINITENESS, noun.definiteness)
                      : 'Someone’s'}{' '}
                    <span>· a / the / my</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelector('case')}
                    className="arabic-quiet arabic-colour-case"
                  >
                    Explore u · a · i
                  </button>
                </div>
              )}
            </div>
            <ColourLegend />
            <Explanation result={result} previous={previous} />
            <div className="arabic-next">
              <div>
                <strong>Try one small change</strong>
                <p>
                  {mode === 'noun'
                    ? 'Keep “his”, then switch between “this is” and “in”. Watch both vowels.'
                    : 'Keep “write”, then switch between “he”, “we” and “you”. Watch the beginning and ending.'}
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
            {selector &&
              (mode === 'noun' ? (
                <NounPicker
                  noun={noun}
                  selector={selector}
                  onChange={changeNoun}
                  onClose={() => setSelector(null)}
                />
              ) : (
                <VerbPicker
                  verb={verb}
                  selector={selector}
                  onChange={changeVerb}
                  onClose={() => setSelector(null)}
                />
              ))}
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
