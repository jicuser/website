import { NOUNS, OWNERS, CONTEXTS, VERBS, PERSONS, TENSES } from './vocabulary.mjs';

const entry = (options, id) => options.find((option) => option.id === id);
const part = (result, id) => result.segments?.find((segment) => segment.id === id);
const capitalise = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);
const compact = (text = '') => text.trim();

/** Remove only a noun's phrase beginning; keep the actual inflection already built. */
export function nounWordPreview(result) {
  const segments = (result.segments || []).filter((segment) => segment.id !== 'context');
  const englishParts = (result.englishParts || [])
    .filter((segment) => segment.id !== 'context')
    .map((segment, index) => ({
      ...segment,
      text: index === 0 ? capitalise(segment.text) : segment.text,
    }));
  return {
    ...result,
    segments,
    arabic: compact(segments.map((segment) => segment.arabic).join('')),
    latin: compact(segments.map((segment) => segment.latin).join('')),
    englishParts,
    translation: compact(englishParts.map((segment) => segment.text).join('')),
  };
}

/** Branches describe existing pieces. They never infer or manufacture new endings. */
export function getWordMapModel({ mode = 'noun', noun = {}, verb = {}, result }) {
  if (mode === 'verb') {
    const past = ['past', 'negative_past'].includes(verb.tenseId);
    return {
      mode,
      wordLabel: entry(VERBS, verb.verbId)?.label || 'Action',
      // Negative particles and the attached future prefix carry meaning: retain them.
      preview: result,
      branches: [
        {
          id: 'person',
          area: 'owner',
          label: 'Who?',
          value: entry(PERSONS, verb.personId)?.label || 'Choose a person',
          token: compact(part(result, past ? 'ending' : 'prefix')?.latin),
          colour: 'owner',
          partId: past ? 'ending' : 'prefix',
        },
        {
          id: 'tense',
          area: 'number',
          label: 'When?',
          value: entry(TENSES, verb.tenseId)?.label || 'Choose a time',
          token: compact(part(result, 'context')?.latin),
          colour: 'context',
          partId: part(result, 'context') ? 'context' : part(result, 'case') ? 'case' : 'stem',
        },
      ],
    };
  }

  const owner = part(result, 'owner');
  const count = part(result, 'number');
  const ending = part(result, 'case');
  const selectedNoun = entry(NOUNS, noun.nounId);
  const countJoinsMy =
    noun.ownerId === 'my' &&
    (noun.number === 'dual' ||
      (noun.number === 'plural' && selectedNoun?.plural?.type === 'sound_m'));
  const endingPiece = ending || count || (noun.ownerId === 'my' ? owner : null);
  return {
    mode: 'noun',
    wordLabel: selectedNoun?.label || 'Word',
    preview: nounWordPreview(result),
    branches: [
      {
        id: 'owner',
        area: 'owner',
        label: 'Whose?',
        value: entry(OWNERS, noun.ownerId)?.label || 'No owner',
        token: compact(owner?.latin),
        colour: 'owner',
        partId: owner ? 'owner' : part(result, 'article') ? 'article' : 'stem',
      },
      {
        id: 'number',
        area: 'number',
        label: 'How many?',
        value: { singular: 'One', dual: 'Two', plural: 'Several' }[noun.number] || 'One',
        token: compact(count?.latin || (countJoinsMy ? owner?.latin : '')),
        colour: 'number',
        partId: count ? 'number' : countJoinsMy ? 'owner' : 'stem',
      },
      {
        id: 'context',
        area: 'context',
        label: 'In a phrase',
        value: entry(CONTEXTS, noun.contextId)?.label || 'Just the word',
        token: compact(part(result, 'context')?.latin),
        colour: 'context',
        partId: null,
      },
      {
        id: 'case',
        area: 'case',
        label: 'Ending sound',
        value: compact(endingPiece?.latin) || 'Part of the word',
        token: ending
          ? 'Follows the phrase'
          : count
            ? 'Number ending'
            : countJoinsMy
              ? 'Number + my joined'
              : noun.ownerId === 'my'
                ? 'With “my”'
                : '',
        colour: 'case',
        partId: endingPiece?.id || 'stem',
      },
    ],
    article: {
      id: 'article',
      label: 'A / the',
      value:
        noun.ownerId !== 'none'
          ? 'Uses the owner'
          : noun.definiteness === 'definite'
            ? 'The'
            : 'A / any',
      colour: 'context',
      partId: part(result, 'article') ? 'article' : owner ? 'owner' : 'stem',
    },
  };
}

const centre = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const point = ({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/** Join the closest facing edges, supporting both the wide and stacked map. */
export function wordMapCurve(from, to) {
  const a = centre(from);
  const b = centre(to);
  const horizontal = Math.abs(b.x - a.x) > Math.abs(b.y - a.y) * 1.2;
  if (horizontal) {
    const direction = b.x >= a.x ? 1 : -1;
    a.x += (from.width / 2) * direction;
    b.x -= (to.width / 2) * direction;
    const mid = (a.x + b.x) / 2;
    return `M ${point(a)} C ${point({ x: mid, y: a.y })} ${point({ x: mid, y: b.y })} ${point(b)}`;
  }
  const direction = b.y >= a.y ? 1 : -1;
  a.y += (from.height / 2) * direction;
  b.y -= (to.height / 2) * direction;
  const mid = (a.y + b.y) / 2;
  return `M ${point(a)} C ${point({ x: a.x, y: mid })} ${point({ x: b.x, y: mid })} ${point(b)}`;
}

/** The active branch reaches its choices through the outside gutter, not another card. */
export function wordMapTrayCurve(from, to, width, fromWord = false) {
  if (fromWord) return wordMapCurve(from, to);
  const a = centre(from);
  const b = centre(to);
  const left = a.x < width / 2;
  a.x += (from.width / 2) * (left ? -1 : 1);
  const lane = left ? 6 : width - 6;
  const elbowY = Math.max(a.y + 12, b.y - 16);
  return `M ${point(a)} C ${point({ x: lane, y: a.y })} ${point({ x: lane, y: a.y })} ${point({ x: lane, y: a.y + 10 })} L ${point({ x: lane, y: elbowY })} C ${point({ x: lane, y: b.y })} ${point({ x: b.x, y: elbowY })} ${point(b)}`;
}
