import React, { useId, useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Plus, RotateCcw, Search, X } from 'lucide-react';
import {
  NOUNS,
  OWNERS,
  CONTEXTS,
  PERSONS,
  TENSES,
  getAvailableNumbers,
  buildNoun,
  buildVerb,
} from './grammar.mjs';
import {
  ArabicResult,
  InlineChoices,
  ColourLegend,
  Explanation,
  OptionButton,
  PickerButton,
} from './ArabicControls';
import {
  buildSentence,
  INITIAL_SENTENCE,
  SENTENCE_TEMPLATES,
  SENTENCE_VERBS,
  sentencePlaceContexts,
  normaliseSentence,
} from './sentences.mjs';
import './sentence-builder.css';

const labelOf = (options, id) => options.find((item) => item.id === id)?.label || id;
const PLACE_IDS = [
  'bayt',
  'masjid',
  'madrasah',
  'ghurfah',
  'suuq',
  'suq',
  'maktab',
  'madinah',
  'maktabah',
  'hadiqah',
];
const COMMON_NOUNS = ['bayt', 'kitab', 'masjid', 'qalam', 'madrasah', 'bab', 'ghurfah', 'sayyarah'];
const COMMON_OWNERS = ['none', 'my', 'our', 'your_m', 'your_f', 'his', 'her'];
const COMMON_PEOPLE = ['i', 'we', 'you_m', 'you_f', 'he', 'she'];
const PATTERN_LABELS = { identify: 'This is…', where: 'Where it is', action: 'An action' };
const NUMBER_LABELS = { singular: 'One', dual: 'Two', plural: 'Several' };
const TIME_LABELS = {
  past: 'Happened',
  present: 'Now / usually',
  future: 'Will happen',
  negative_present: 'Does not',
  negative_past: 'Did not',
};
const normaliseSearch = (text) =>
  String(text).normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').toLowerCase().trim();

// Keep a suffix's first vowel visible when it is shown without its word.
const shortToken = (part) => ({
  arabic: (part?.arabic || '').trim().replace(/^(\p{M})/u, 'ـ$1'),
  latin: (part?.latin || '').trim(),
});

export default function SentenceBuilder() {
  const [state, setState] = useState(INITIAL_SENTENCE);
  const [selector, setSelector] = useState(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [previous, setPrevious] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const choiceId = useId();
  const searchId = useId();
  const negativeNoteId = useId();
  const result = useMemo(() => buildSentence(state), [state]);

  const change = (patch) => {
    setPrevious(result);
    setCopyStatus('');
    setState((current) => normaliseSentence({ ...current, ...patch }));
  };
  const changeSlot = (slot, patch) => {
    change({
      [slot]: { ...state[slot], ...patch },
      ...(slot === 'action' && patch.tenseId?.startsWith('negative_') ? { question: false } : {}),
    });
  };
  const isChoosing = (slot, key) => selector?.slot === slot && selector?.key === key;
  const openChoice = (slot, key, partId, hint) => {
    setSelector(!hint && isChoosing(slot, key) ? null : { slot, key, partId, hint });
    setSearch('');
    setShowAll(false);
  };
  const pickerProps = (slot, key) => ({
    onClick: () => openChoice(slot, key),
    expanded: isChoosing(slot, key),
    controlsId: choiceId,
  });
  const choosePattern = (template) => {
    change({ template });
    setSelector(null);
  };
  const pickPart = (id, detail = {}) => {
    const [slot, part] = id.split(':');
    if (slot === 'question' || id === 'punctuation') {
      change({ question: !state.question });
      return;
    }
    const key =
      slot === 'action'
        ? part === 'stem'
          ? 'verbId'
          : part === 'context' || part === 'case'
            ? 'tenseId'
            : 'personId'
        : part === 'owner' || part === 'article'
          ? 'ownerId'
          : part === 'number'
            ? 'number'
            : slot === 'place' && (part === 'context' || part === 'case')
              ? 'contextId'
              : part === 'case' || part === 'context'
                ? 'role'
                : 'nounId';
    const hint =
      part === 'stem' && detail.mark
        ? 'This sound belongs to the word. Choose another word to compare.'
        : undefined;
    openChoice(slot, key, id, hint);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${result.arabic}\n${result.latin}\n${result.translation}`,
      );
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy is unavailable. Select the sentence text to copy it.');
    }
  };

  let options = [];
  let title = '';
  let description;
  let colour = 'stem';
  let commonIds;
  if (selector) {
    const { slot, key } = selector;
    if (key === 'nounId') {
      options = slot === 'place' ? NOUNS.filter((item) => PLACE_IDS.includes(item.id)) : NOUNS;
      commonIds = slot === 'place' ? PLACE_IDS : COMMON_NOUNS;
      title = slot === 'place' ? 'Choose a place' : 'Choose a word';
    }
    if (key === 'ownerId') {
      options = OWNERS;
      commonIds = COMMON_OWNERS;
      title = slot === 'place' ? 'Whose place?' : 'Whose thing?';
      colour = 'owner';
    }
    if (key === 'number') {
      options = getAvailableNumbers(state[slot].nounId);
      title = 'How many?';
      colour = 'number';
    }
    if (key === 'contextId') {
      options = CONTEXTS.filter((item) =>
        sentencePlaceContexts(state.template, state.action.verbId).includes(item.id),
      );
      title = 'In, from or to?';
      description = 'The next word’s ending follows this choice automatically.';
      colour = 'context';
    }
    if (key === 'verbId') {
      options = SENTENCE_VERBS;
      title = 'Choose an action';
    }
    if (key === 'personId') {
      options = PERSONS;
      commonIds = COMMON_PEOPLE;
      title = 'Who does it?';
      colour = 'owner';
    }
    if (key === 'tenseId') {
      options = TENSES;
      title = 'When — or not?';
      colour = 'context';
    }
    if (key === 'role') {
      options = SENTENCE_TEMPLATES.filter((template) => template.id !== 'action');
      title = 'How this part fits';
      description =
        state.template === 'identify'
          ? '“This” follows the word you choose. The ending follows its job in the sentence.'
          : 'The first thing keeps its own ending. “In” or “from” changes the place word after it.';
      colour = 'context';
    }
    if (selector.hint) description = selector.hint;
  }
  const currentChoice = selector
    ? selector.key === 'role'
      ? state.template
      : state[selector.slot][selector.key]
    : null;
  const query = normaliseSearch(search);
  const hasMoreChoices = commonIds && options.some((option) => !commonIds.includes(option.id));
  const visibleOptions = options.filter((option) => {
    if (selector?.key === 'nounId' && query)
      return normaliseSearch(
        [option.label, option.english, option.arabic, option.latin, option.root].join(' '),
      ).includes(query);
    return showAll || !commonIds || commonIds.includes(option.id) || option.id === currentChoice;
  });
  // A selected uncommon word remains visible when returning to the common choices.
  if (commonIds && !query)
    visibleOptions.sort((a, b) => {
      const order = (option) => {
        const index = commonIds.indexOf(option.id);
        return index === -1 ? commonIds.length : index;
      };
      return order(a) - order(b);
    });

  const choiceToken = (option) => {
    if (selector.key === 'ownerId') {
      if (option.id === 'none') return {};
      const noun = buildNoun({ ...state[selector.slot], ownerId: option.id });
      return shortToken(noun.segments.find((part) => part.id === 'owner'));
    }
    if (selector.key === 'tenseId') {
      const verb = buildVerb({ ...state.action, tenseId: option.id });
      return shortToken(verb.segments.find((part) => part.id === 'context'));
    }
    return shortToken(option);
  };
  const selectOption = (option) => {
    const { slot, key } = selector;
    if (key === 'role') {
      change({ template: option.id });
      return;
    }
    const patch = { [key]: option.id };
    if (
      key === 'nounId' &&
      !getAvailableNumbers(option.id).some((number) => number.id === state[slot].number)
    )
      patch.number = 'singular';
    changeSlot(slot, patch);
  };

  const hasSubject = state.template !== 'action';
  const hasPlace =
    state.template === 'where' || (state.template === 'action' && state.includePlace);
  const questionUnavailable =
    state.template === 'action' && state.action.tenseId.startsWith('negative_');
  const selectedNoun = selector && selector.slot !== 'action' ? state[selector.slot] : null;
  const countJoinsMy =
    selectedNoun?.ownerId === 'my' &&
    (selectedNoun.number === 'dual' ||
      (selectedNoun.number === 'plural' &&
        NOUNS.find((noun) => noun.id === selectedNoun.nounId)?.plural?.type === 'sound_m'));
  const partCandidates = selector
    ? [
        selector.partId,
        ...{
          nounId: ['stem'],
          ownerId: ['owner', 'article', 'stem'],
          number: ['number', ...(countJoinsMy ? ['owner'] : []), 'stem'],
          contextId: ['context'],
          verbId: ['stem'],
          personId: state.action.tenseId.includes('past') ? ['ending'] : ['prefix', 'ending'],
          tenseId: ['context', 'case', 'stem'],
          role: ['case', 'context', 'stem'],
        }[selector.key].map((part) => `${selector.slot}:${part}`),
      ]
    : [];
  // Choices can remove or merge a piece: keep the highlight on something visible.
  const selectedPart =
    partCandidates.find((id) => result.segments.some((part) => part.id === id)) || null;

  return (
    <div className="arabic-sentence-studio">
      <div className="arabic-section-intro">
        <h2>Make a sentence</h2>
        <p>Tap a coloured part. Try a choice. See what changes.</p>
      </div>
      <div className={`arabic-panel arabic-builder ${selector ? 'has-choices' : ''}`}>
        <ArabicResult
          result={result}
          previous={previous}
          onPartClick={pickPart}
          selectedPart={selectedPart}
          compact
        />
        <div className="arabic-sentence-patterns" role="group" aria-label="Sentence pattern">
          {SENTENCE_TEMPLATES.map((template) => (
            <button
              type="button"
              key={template.id}
              aria-pressed={state.template === template.id}
              onClick={() => choosePattern(template.id)}
            >
              {state.template === template.id && <Check size={14} aria-hidden="true" />}
              {PATTERN_LABELS[template.id]}
            </button>
          ))}
        </div>
        <div className="arabic-sentence-fields">
          <div
            className="arabic-sentence-slot"
            role="group"
            aria-label={hasSubject ? 'The thing' : 'The action'}
          >
            {hasSubject ? (
              <>
                <PickerButton
                  label="Word"
                  value={labelOf(NOUNS, state.subject.nounId)}
                  {...pickerProps('subject', 'nounId')}
                />
                <PickerButton
                  label="Whose?"
                  colour="owner"
                  value={labelOf(OWNERS, state.subject.ownerId)}
                  {...pickerProps('subject', 'ownerId')}
                />
                <PickerButton
                  label="How many?"
                  colour="number"
                  value={NUMBER_LABELS[state.subject.number]}
                  {...pickerProps('subject', 'number')}
                />
              </>
            ) : (
              <>
                <PickerButton
                  label="Action"
                  value={labelOf(SENTENCE_VERBS, state.action.verbId)}
                  {...pickerProps('action', 'verbId')}
                />
                <PickerButton
                  label="Who?"
                  colour="owner"
                  value={labelOf(PERSONS, state.action.personId)}
                  {...pickerProps('action', 'personId')}
                />
                <PickerButton
                  label="When?"
                  colour="context"
                  value={TIME_LABELS[state.action.tenseId]}
                  {...pickerProps('action', 'tenseId')}
                />
              </>
            )}
          </div>
          {hasPlace && (
            <div
              className="arabic-sentence-slot arabic-sentence-place"
              role="group"
              aria-label="The place"
            >
              <PickerButton
                label="Where?"
                colour="context"
                value={labelOf(CONTEXTS, state.place.contextId)}
                {...pickerProps('place', 'contextId')}
              />
              <PickerButton
                label="Place"
                value={labelOf(NOUNS, state.place.nounId)}
                {...pickerProps('place', 'nounId')}
              />
              <PickerButton
                label="Whose?"
                colour="owner"
                value={labelOf(OWNERS, state.place.ownerId)}
                {...pickerProps('place', 'ownerId')}
              />
              <PickerButton
                label="How many?"
                colour="number"
                value={NUMBER_LABELS[state.place.number]}
                {...pickerProps('place', 'number')}
              />
            </div>
          )}
        </div>
        {selector && (
          <InlineChoices
            key={`${selector.slot}-${selector.key}`}
            id={choiceId}
            title={title}
            description={description}
            colour={colour}
            onClose={() => setSelector(null)}
            className="arabic-sentence-choices"
          >
            {(selector.key === 'nounId' || hasMoreChoices) && (
              <div className="arabic-sentence-choice-tools">
                {selector.key === 'nounId' && (
                  <label className="arabic-sentence-search" htmlFor={searchId}>
                    <Search size={16} aria-hidden="true" />
                    <span className="sr-only">Search all {options.length} words</span>
                    <input
                      id={searchId}
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Find a word…"
                      autoComplete="off"
                      spellCheck={false}
                      dir="auto"
                    />
                  </label>
                )}
                {hasMoreChoices && !query && (
                  <button
                    type="button"
                    className="arabic-quiet arabic-sentence-more"
                    aria-pressed={showAll}
                    onClick={() => setShowAll((current) => !current)}
                  >
                    {showAll
                      ? 'Common choices'
                      : selector.key === 'nounId'
                        ? `All ${options.length} words`
                        : 'More people'}
                  </button>
                )}
              </div>
            )}
            <div className="arabic-option-grid">
              {visibleOptions.map((option) => (
                <OptionButton
                  key={option.id}
                  label={
                    selector.key === 'role'
                      ? PATTERN_LABELS[option.id]
                      : selector.key === 'number'
                        ? NUMBER_LABELS[option.id]
                        : selector.key === 'tenseId'
                          ? TIME_LABELS[option.id]
                          : option.label
                  }
                  {...choiceToken(option)}
                  selected={currentChoice === option.id}
                  colour={colour}
                  onClick={() => selectOption(option)}
                />
              ))}
            </div>
            {visibleOptions.length === 0 && (
              <p className="arabic-sentence-empty" role="status">
                No match. Try English, Arabic or the written pronunciation.
              </p>
            )}
          </InlineChoices>
        )}
        <div className="arabic-extra-controls arabic-sentence-actions">
          <button
            type="button"
            className={`arabic-quiet ${state.question ? 'is-selected' : ''}`}
            aria-pressed={state.question}
            disabled={questionUnavailable}
            aria-describedby={questionUnavailable ? negativeNoteId : undefined}
            onClick={() => change({ question: !state.question })}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {state.question ? 'Question · hal' : 'Ask a question'}
          </button>
          {state.template === 'action' && (
            <button
              type="button"
              className="arabic-quiet"
              aria-pressed={state.includePlace}
              onClick={() => {
                change({ includePlace: !state.includePlace });
                if (selector?.slot === 'place') setSelector(null);
              }}
            >
              {state.includePlace ? (
                <X size={16} aria-hidden="true" />
              ) : (
                <Plus size={16} aria-hidden="true" />
              )}
              {state.includePlace ? 'Remove place' : 'Add a place'}
            </button>
          )}
          <button type="button" className="arabic-quiet" onClick={copy}>
            {copyStatus === 'Copied' ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            Copy
          </button>
          <button
            type="button"
            className="arabic-quiet"
            onClick={() => {
              setState(INITIAL_SENTENCE);
              setPrevious(null);
              setCopyStatus('');
              setSelector(null);
              setSearch('');
              setShowAll(false);
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
      {copyStatus && (
        <p className="arabic-helper" role="status">
          {copyStatus}
        </p>
      )}
      {questionUnavailable && (
        <p id={negativeNoteId} className="arabic-helper">
          Choose a positive action to ask a question with hal.
        </p>
      )}
      <Explanation result={result} previous={previous} />
      <ColourLegend />
      <p className="arabic-helper">
        Guided practice sentences. Choose words that make sense together.
      </p>
    </div>
  );
}
