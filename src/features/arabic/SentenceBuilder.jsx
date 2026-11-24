import React, { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Plus, RotateCcw, X } from 'lucide-react';
import {
  NOUNS,
  OWNERS,
  CONTEXTS,
  VERBS,
  PERSONS,
  TENSES,
  getAvailableNumbers,
  buildNoun,
  buildVerb,
} from './grammar.mjs';
import {
  ArabicResult,
  ChoiceDialog,
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

export default function SentenceBuilder() {
  const [state, setState] = useState(INITIAL_SENTENCE);
  const [selector, setSelector] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
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
  const pickPart = (id) => {
    const [slot, part] = id.split(':');
    if (slot === 'question' || id === 'punctuation') {
      change({ question: !state.question });
      return;
    }
    if (slot === 'action')
      setSelector({
        slot,
        key:
          part === 'stem'
            ? 'verbId'
            : part === 'context' || part === 'case'
              ? 'tenseId'
              : 'personId',
      });
    else
      setSelector({
        slot,
        key:
          part === 'owner'
            ? 'ownerId'
            : part === 'number'
              ? 'number'
              : slot === 'place' && (part === 'context' || part === 'case')
                ? 'contextId'
                : part === 'case' || part === 'context' || part === 'article'
                  ? 'role'
                  : 'nounId',
      });
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
  let colour = 'stem';
  if (selector) {
    const { slot, key } = selector;
    if (key === 'nounId') {
      options = slot === 'place' ? NOUNS.filter((item) => PLACE_IDS.includes(item.id)) : NOUNS;
      title = slot === 'place' ? 'Choose a place' : 'What is the sentence about?';
    }
    if (key === 'ownerId') {
      options = OWNERS;
      title = 'Whose — or connected to whom?';
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
      title = 'How does this place fit?';
      colour = 'context';
    }
    if (key === 'verbId') {
      options = SENTENCE_VERBS;
      title = 'Choose an action';
    }
    if (key === 'personId') {
      options = PERSONS;
      title = 'Who does it?';
      colour = 'owner';
    }
    if (key === 'tenseId') {
      options = TENSES;
      title = 'When does it happen?';
      colour = 'context';
    }
  }
  const hasSubject = state.template !== 'action';
  const hasPlace =
    state.template === 'where' || (state.template === 'action' && state.includePlace);
  const questionUnavailable =
    state.template === 'action' && state.action.tenseId.startsWith('negative_');
  return (
    <div className="arabic-sentence-studio">
      <div className="arabic-section-intro">
        <h2>Put the pieces together</h2>
        <p>Choose a thought, then tap any word to make it yours.</p>
      </div>
      <div className="arabic-template-row" role="group" aria-label="Sentence pattern">
        {SENTENCE_TEMPLATES.map((template) => (
          <button
            type="button"
            key={template.id}
            aria-pressed={state.template === template.id}
            onClick={() => change({ template: template.id })}
          >
            <strong>{template.label}</strong>
            <span>{template.example}</span>
          </button>
        ))}
      </div>
      <div className="arabic-panel arabic-builder">
        <div className="arabic-sentence-slots">
          {hasSubject && (
            <div className="arabic-slot">
              <span className="arabic-slot-label">The thing</span>
              <PickerButton
                label="Word"
                value={labelOf(NOUNS, state.subject.nounId)}
                onClick={() => setSelector({ slot: 'subject', key: 'nounId' })}
              />
              <PickerButton
                label="Whose?"
                colour="owner"
                value={labelOf(OWNERS, state.subject.ownerId)}
                onClick={() => setSelector({ slot: 'subject', key: 'ownerId' })}
              />
              <button
                type="button"
                className="arabic-quiet arabic-colour-number"
                onClick={() => setSelector({ slot: 'subject', key: 'number' })}
              >
                {labelOf(getAvailableNumbers(state.subject.nounId), state.subject.number)}
              </button>
            </div>
          )}
          {!hasSubject && (
            <div className="arabic-slot">
              <span className="arabic-slot-label">The action</span>
              <PickerButton
                label="Action"
                value={labelOf(VERBS, state.action.verbId)}
                onClick={() => setSelector({ slot: 'action', key: 'verbId' })}
              />
              <PickerButton
                label="Who?"
                colour="owner"
                value={labelOf(PERSONS, state.action.personId)}
                onClick={() => setSelector({ slot: 'action', key: 'personId' })}
              />
              <PickerButton
                label="When?"
                colour="context"
                value={labelOf(TENSES, state.action.tenseId)}
                onClick={() => setSelector({ slot: 'action', key: 'tenseId' })}
              />
            </div>
          )}
          {hasPlace && (
            <div className="arabic-slot">
              <span className="arabic-slot-label">The place</span>
              <PickerButton
                label="Where?"
                colour="context"
                value={labelOf(CONTEXTS, state.place.contextId)}
                onClick={() => setSelector({ slot: 'place', key: 'contextId' })}
              />
              <PickerButton
                label="Place"
                value={labelOf(NOUNS, state.place.nounId)}
                onClick={() => setSelector({ slot: 'place', key: 'nounId' })}
              />
              <PickerButton
                label="Whose?"
                colour="owner"
                value={labelOf(OWNERS, state.place.ownerId)}
                onClick={() => setSelector({ slot: 'place', key: 'ownerId' })}
              />
            </div>
          )}
        </div>
        <ArabicResult result={result} previous={previous} onPartClick={pickPart} compact />
        <div className="arabic-extra-controls">
          <button
            type="button"
            className={`arabic-quiet ${state.question ? 'is-selected' : ''}`}
            aria-pressed={state.question}
            disabled={questionUnavailable}
            aria-describedby={questionUnavailable ? 'arabic-negative-question-note' : undefined}
            onClick={() => change({ question: !state.question })}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {state.question ? 'Question · hal added' : 'Make it a question'}
          </button>
          {state.template === 'action' && (
            <button
              type="button"
              className="arabic-quiet"
              onClick={() => change({ includePlace: !state.includePlace })}
            >
              {state.includePlace ? <X size={16} /> : <Plus size={16} />}
              {state.includePlace ? 'Remove place' : 'Add a place'}
            </button>
          )}
          <button type="button" className="arabic-quiet" onClick={copy}>
            {copyStatus === 'Copied' ? <Check size={16} /> : <Copy size={16} />}Copy sentence
          </button>
          <button
            type="button"
            className="arabic-quiet"
            onClick={() => {
              setState(INITIAL_SENTENCE);
              setPrevious(null);
              setCopyStatus('');
            }}
          >
            <RotateCcw size={16} />
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
        <p id="arabic-negative-question-note" className="arabic-helper">
          Negative questions need a different opening. Choose a positive action to explore questions
          with hal here.
        </p>
      )}
      <ColourLegend />
      <Explanation result={result} previous={previous} />
      <p className="arabic-helper">
        Guided patterns help keep the structure correct. Choose words that make sense together.
        These are practice sentences, not Qur’anic quotations.
      </p>
      {selector?.key === 'role' ? (
        <ChoiceDialog
          title="How this part fits"
          description={
            state.template === 'identify'
              ? 'The beginning points out the thing. It changes for a feminine word, two things or a group.'
              : 'This first noun names what the sentence is about. Adding a place changes the place word, not this one.'
          }
          onClose={() => setSelector(null)}
        >
          <Explanation
            result={buildNoun({
              ...state.subject,
              contextId: state.template === 'identify' ? 'this' : 'phrase',
            })}
          />
          <div className="arabic-option-grid">
            {SENTENCE_TEMPLATES.filter((template) => template.id !== 'action').map((template) => (
              <OptionButton
                key={template.id}
                label={template.label}
                description={template.example}
                selected={state.template === template.id}
                colour="context"
                onClick={() => {
                  change({ template: template.id });
                  setSelector(null);
                }}
              />
            ))}
          </div>
        </ChoiceDialog>
      ) : (
        selector && (
          <ChoiceDialog
            title={title}
            description="Choose an option to update this part of your sentence."
            onClose={() => setSelector(null)}
          >
            <div className="arabic-option-grid">
              {options.map((option) => {
                const { slot, key } = selector;
                const patch = { [key]: option.id };
                if (
                  key === 'nounId' &&
                  !getAvailableNumbers(option.id).some((number) => number.id === state[slot].number)
                )
                  patch.number = 'singular';
                const example =
                  slot === 'action'
                    ? buildVerb({ ...state.action, ...patch })
                    : buildNoun({ ...state[slot], ...patch });
                return (
                  <OptionButton
                    key={option.id}
                    label={option.label}
                    arabic={example.arabic}
                    latin={example.latin}
                    description={example.translation}
                    selected={state[slot][key] === option.id}
                    colour={colour}
                    onClick={() => {
                      changeSlot(slot, patch);
                      setSelector(null);
                    }}
                  />
                );
              })}
            </div>
          </ChoiceDialog>
        )
      )}
    </div>
  );
}
