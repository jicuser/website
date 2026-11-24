import { buildNoun, buildVerb, NOUNS, PERSONS, VERBS } from './grammar.mjs';

const capitalise = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);
const scoped = (result, slot) =>
  result.segments.map((part) => ({ ...part, id: `${slot}:${part.id}` }));
const withSpace = (segments) =>
  segments.map((part, index) =>
    index === segments.length - 1
      ? { ...part, arabic: `${part.arabic} `, latin: `${part.latin} ` }
      : part,
  );
const partsFor = (result, slot, embedded = false) =>
  (result.englishParts || [{ id: 'stem', text: result.translation }]).map((part, index) => ({
    ...part,
    id: `${slot}:${part.id}`,
    text: embedded && index === 0 ? part.text[0].toLowerCase() + part.text.slice(1) : part.text,
  }));
const joinParts = (parts) => parts.map((part) => part.text).join('');

export const SENTENCE_TEMPLATES = [
  { id: 'identify', label: 'This is…', example: 'This is our house.' },
  { id: 'where', label: 'Say where it is', example: 'Our book is in his house.' },
  { id: 'action', label: 'Say what happens', example: 'We wrote in our house.' },
];

export const INITIAL_SENTENCE = {
  template: 'where',
  question: false,
  includePlace: true,
  subject: {
    nounId: 'kitab',
    ownerId: 'our',
    contextId: 'phrase',
    number: 'singular',
    definiteness: 'definite',
  },
  place: {
    nounId: 'bayt',
    ownerId: 'his',
    contextId: 'in',
    number: 'singular',
    definiteness: 'definite',
  },
  action: { verbId: 'kataba', personId: 'we', tenseId: 'past' },
};

export const SENTENCE_VERBS = VERBS.filter((verb) =>
  ['kataba', 'darasa', 'shariba', 'jalasa', 'kharaja'].includes(verb.id),
);

export function sentencePlaceContexts(template, verbId) {
  if (template !== 'action') return ['in', 'from'];
  return verbId === 'kharaja' ? ['from', 'to'] : ['in'];
}

export function normaliseSentence(state) {
  const allowedContexts = sentencePlaceContexts(state.template, state.action.verbId);
  return {
    ...state,
    question:
      state.question &&
      !(state.template === 'action' && state.action.tenseId.startsWith('negative_')),
    place: {
      ...state.place,
      contextId: allowedContexts.includes(state.place.contextId)
        ? state.place.contextId
        : allowedContexts[0],
    },
  };
}

export function buildSentence(input) {
  const state = normaliseSentence(input);
  const { template, subject, place, action, includePlace } = state;
  const question =
    state.question && !(template === 'action' && action.tenseId.startsWith('negative_'));
  const noun = buildNoun({
    ...subject,
    contextId: template === 'identify' ? 'this' : 'phrase',
    definiteness: 'definite',
  });
  const location = buildNoun(place);
  const verb = buildVerb(action);
  let segments;
  let englishParts;
  let notes;
  if (template === 'identify') {
    segments = scoped(noun, 'subject');
    englishParts = partsFor(noun, 'subject');
    notes = [
      {
        title: 'A complete thought without a separate “is”',
        body: 'Arabic can identify something without a present-time word for “is”. Change whose thing it is, or how many, and watch the pointing word too.',
      },
      ...noun.notes,
    ];
    if (question) {
      const translation = joinParts(englishParts);
      const interrogative = translation
        .replace(/^This is\b/i, 'Is this')
        .replace(/^These are\b/i, 'Are these')
        .replace(/^These two are\b/i, 'Are these two');
      englishParts = [{ id: 'context', text: interrogative }];
    }
  } else if (template === 'where') {
    segments = [...withSpace(scoped(noun, 'subject')), ...scoped(location, 'place')];
    const linking = subject.number === 'singular' ? 'is' : 'are';
    const subjectParts = partsFor(noun, 'subject', true);
    const locationParts = partsFor(location, 'place', true);
    englishParts = question
      ? [
          { id: 'context', text: `${capitalise(linking)} ` },
          ...subjectParts,
          { id: 'context', text: ' ' },
          ...locationParts,
        ]
      : [...subjectParts, { id: 'context', text: ` ${linking} ` }, ...locationParts];
    notes = [
      {
        title: question ? 'Add hal to ask “is it?”' : 'Arabic leaves “is” understood here',
        body: question
          ? 'هَلْ (hal) turns this statement into a yes/no question. The rest of the Arabic stays in the same order.'
          : 'First name the thing; then say where it is. English adds “is” or “are”. Arabic does not need a separate present-time “is” in this pattern.',
      },
      {
        title: 'The place affects its own word',
        body: '“In”, “from” and “to” change the ending of the place word after them. They do not change the ending of the first word in this sentence.',
      },
      ...location.notes,
    ];
  } else {
    segments = includePlace
      ? [...withSpace(scoped(verb, 'action')), ...scoped(location, 'place')]
      : scoped(verb, 'action');
    englishParts = [
      ...partsFor(verb, 'action'),
      ...(includePlace ? [{ id: 'context', text: ' ' }, ...partsFor(location, 'place', true)] : []),
    ];
    notes = [
      {
        title: 'The action already tells us who',
        body: 'The Arabic verb’s beginning or ending tells you who acts. A separate word for “we” or “he” is often unnecessary. Add a place to make the thought more specific.',
      },
      ...verb.notes,
      ...(includePlace ? location.notes.slice(0, 1) : []),
    ];
    if (question) {
      // Guided yes/no questions use the English verb entry, never a guessed Arabic inflection.
      const person = PERSONS.find((entry) => entry.id === action.personId);
      const englishSubject = person.english;
      const entry = VERBS.find((item) => item.id === action.verbId);
      const base = entry.english;
      const auxiliary =
        action.tenseId === 'past' || action.tenseId === 'negative_past'
          ? 'Did'
          : action.tenseId === 'future'
            ? 'Will'
            : ['he', 'she'].includes(action.personId)
              ? 'Does'
              : 'Do';
      const negative = action.tenseId.startsWith('negative_') ? ' not' : '';
      englishParts = [
        { id: 'context', text: `${auxiliary} ` },
        {
          id: 'owner',
          text: `${englishSubject === 'I' ? 'I' : englishSubject.toLowerCase()}${negative} `,
        },
        { id: 'stem', text: base },
        ...(includePlace
          ? [{ id: 'context', text: ' ' }, ...partsFor(location, 'place', true)]
          : []),
      ];
    }
  }
  if (input.question && !question)
    notes.unshift({
      title: 'A different question opening is needed',
      body: 'Hal is used here with positive statements. Negative questions use a different opening, so this guided pattern keeps your negative sentence as a statement.',
    });
  if (question)
    segments = [
      {
        id: 'question:context',
        arabic: 'هَلْ ',
        latin: 'hal ',
        label: 'Ask a yes/no question',
        meaning: 'is / does / did…?',
      },
      ...segments,
      { id: 'punctuation', arabic: '؟', latin: '?', label: 'Question mark', meaning: 'question' },
    ];
  englishParts = englishParts.map((part, index) => ({
    ...part,
    text: index === 0 ? capitalise(part.text) : part.text,
  }));
  return {
    arabic: segments.map((part) => part.arabic).join(''),
    latin: segments.map((part) => part.latin).join(''),
    translation: `${joinParts(englishParts).replace(/[.?!]+$/, '')}${question ? '?' : '.'}`,
    englishParts: [...englishParts, { id: 'context', text: question ? '?' : '.' }],
    segments,
    notes,
    grammar: { template, question },
  };
}
