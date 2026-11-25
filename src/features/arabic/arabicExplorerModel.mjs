import { buildNoun, buildVerb, CONTEXTS, NOUNS, OWNERS } from './grammar.mjs';
import { HARAKAT } from './arabicGlyphModel.mjs';
import { segmentRanges } from './arabicConnectionModel.mjs';

export const INITIAL_EXPLORER_NOUN = Object.freeze({
  nounId: 'bayt',
  ownerId: 'my',
  contextId: 'this',
  number: 'singular',
  definiteness: 'indefinite',
});

export const EXPLORER_FAMILIES = Object.freeze([
  {
    id: 'pointing',
    label: 'Pointing',
    description: 'Point to something near you or farther away.',
    contextIds: ['this', 'that'],
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Say in, from, or to a place. These beginnings affect the word after them.',
    contextIds: ['in', 'from', 'to'],
  },
  {
    id: 'actions',
    label: 'Actions',
    description: 'Say what you did, then name what you saw, opened, or entered.',
    contextIds: ['saw', 'opened', 'entered'],
  },
]);

const entry = (items, id) => items.find((item) => item.id === id);
const tail = (id) => id.split(':').at(-1);
const trim = (value = '') => value.trim();
const rangeIndices = (start, end) =>
  Array.from({ length: end - start }, (_, index) => start + index);

export function isExplorerContextCompatible(contextId, nounId) {
  const context = entry(CONTEXTS, contextId);
  if (!context || !entry(NOUNS, nounId)) return false;
  return !context.compatibleNounIds || context.compatibleNounIds.includes(nounId);
}

function familyOptions(noun) {
  return EXPLORER_FAMILIES.map((family) => ({
    ...family,
    options: family.contextIds.map((id) => {
      const context = entry(CONTEXTS, id);
      const disabled = !isExplorerContextCompatible(id, noun.nounId);
      const exampleNounId = disabled ? context.defaultNounId : noun.nounId;
      const result = buildNoun({ ...noun, nounId: exampleNounId, contextId: id });
      const names = (context.compatibleNounIds || []).map((nounId) => entry(NOUNS, nounId).english);
      return {
        id,
        label: context.label.replace('…', ''),
        result,
        patch: { contextId: id },
        disabled,
        reason: disabled ? `Choose ${names.join(', ')} for this checked action example.` : '',
        exampleOnly: disabled,
      };
    }),
  }));
}

function slicedSegments(result, start, end, latinOverride) {
  const slices = segmentRanges(result)
    .filter((part) => part.start < end && part.end > start)
    .map((part) => ({
      id: part.id,
      arabic: result.arabic.slice(Math.max(start, part.start), Math.min(end, part.end)),
      // Engine boundaries normally coincide with word/part boundaries. The
      // checked context-word/action slices provide their own exact Latin text.
      latin: part.latin.trim(),
      label: part.label,
      meaning: part.meaning,
    }));
  if (latinOverride != null && slices.length === 1) slices[0].latin = latinOverride;
  return slices;
}

const selectorFor = (id, mode) => {
  const key = tail(id);
  if (key === 'prefix' || key === 'ending') return mode === 'verb' ? 'person' : 'context';
  if (['case', 'context'].includes(key) && mode === 'verb') return 'tense';
  return ['stem', 'owner', 'context', 'case', 'number', 'article'].includes(key) ? key : null;
};

function partDescription(part, state, mode) {
  const key = tail(part.id);
  if (mode === 'noun' && key === 'owner' && state.ownerId === 'my') {
    if (state.number === 'dual')
      return 'Two and my join into this one ending: āya in the pointing pattern, ayya after a location word or these actions.';
    if (state.number === 'plural' && entry(NOUNS, state.nounId)?.plural?.type === 'sound_m')
      return 'The people-plural ending and my join into iyya. They are one combined piece here.';
    return 'The whole long ī ending means my. There is no separate visible u, a, or i to add before it.';
  }
  if (mode === 'noun' && key === 'case')
    return 'This ending shows how the noun fits the whole phrase. Choose a sentence family to see why it changes.';
  if (mode === 'noun' && key === 'stem')
    return 'This is the word for the thing. Its final consonant belongs to the word, not to the owner ending.';
  if (key === 'owner')
    return 'This attached ending says whose, or who the thing is connected to. Its meaning belongs to the whole ending.';
  if (key === 'number')
    return 'This is one number ending. Its form also changes with the word’s job and with an attached owner.';
  if (key === 'article')
    return 'Al- makes the noun particular: the. An attached owner already identifies it.';
  if (mode === 'verb' && ['prefix', 'ending'].includes(key))
    return 'The verb’s beginning and ending work together to tell us who acts. A sound inside this piece is not a separate English word.';
  if (mode === 'verb' && key === 'case')
    return 'This is the ordinary present-form ending. The person information is elsewhere in the verb.';
  return part.meaning || part.label;
}

function refineActionResult(result, context) {
  if (!context?.actionParts || !result.segments.some((part) => part.id === 'context'))
    return result;
  const segments = result.segments.flatMap((part) => {
    if (part.id !== 'context') return part;
    const arabicSpace = part.arabic.slice(part.arabic.trimEnd().length);
    const latinSpace = part.latin.slice(part.latin.trimEnd().length);
    return context.actionParts.map((actionPart, index) => ({
      ...actionPart,
      id: `context:${actionPart.id}`,
      arabic: actionPart.arabic + (index === context.actionParts.length - 1 ? arabicSpace : ''),
      latin: actionPart.latin + (index === context.actionParts.length - 1 ? latinSpace : ''),
    }));
  });
  const englishParts = result.englishParts.flatMap((part) =>
    part.id === 'context'
      ? [
          { id: 'context:ending', text: 'I ' },
          { id: 'context:stem', text: `${context.english.slice(2)} ` },
        ]
      : part,
  );
  return { ...result, segments, englishParts };
}

/**
 * A source tree, not a grammar-category cloud. Every structural child occupies
 * a real contiguous range in result.arabic; causation is a separate edge list.
 * All offsets are UTF-16 indices, matching ArabicGlyphs' sourceIndex callback.
 */
export function buildExplorerModel({ mode = 'noun', noun = {}, verb = {}, result } = {}) {
  if (!['noun', 'verb'].includes(mode)) throw new RangeError(`Unknown explorer mode: ${mode}`);
  const nounState = { ...INITIAL_EXPLORER_NOUN, ...(result?.grammar || {}), ...noun };
  const verbState = {
    verbId: 'kataba',
    personId: 'we',
    tenseId: 'past',
    ...(result?.grammar || {}),
    ...verb,
  };
  const context = mode === 'noun' ? entry(CONTEXTS, nounState.contextId) : null;
  const rawResult = result || (mode === 'noun' ? buildNoun(nounState) : buildVerb(verbState));
  const current = mode === 'noun' ? refineActionResult(rawResult, context) : rawResult;
  if ((current.segments || []).map((part) => part.arabic).join('') !== current.arabic)
    throw new RangeError('Explorer source segments must join to the exact Arabic result.');
  const state = mode === 'noun' ? nounState : verbState;
  const nodes = [];
  const structureEdges = [];
  const add = (node) => {
    const complete = {
      parentId: null,
      children: [],
      selector: null,
      familyId: null,
      description: '',
      ...node,
      segmentIds: [...new Set(node.segments.map((part) => part.id))],
    };
    nodes.push(complete);
    if (complete.parentId) {
      nodes.find((parent) => parent.id === complete.parentId).children.push(complete.id);
      structureEdges.push({
        id: `structure:${complete.parentId}:${complete.id}`,
        from: complete.parentId,
        to: complete.id,
        type: 'structure',
      });
    }
    return complete;
  };
  add({
    id: 'sentence',
    kind: 'sentence',
    arabic: current.arabic,
    latin: current.latin,
    meaning: current.translation,
    sourceStart: 0,
    sourceEnd: current.arabic.length,
    segments: current.segments,
    description:
      'The whole thought. Follow its branches to the words, then to the meaningful pieces inside each word.',
  });
  const ranges = segmentRanges(current);
  const words = [...current.arabic.matchAll(/\S+/gu)];
  const wordIds = [];
  let contextIndex = 0;
  for (const word of words) {
    const start = word.index;
    const end = start + word[0].length;
    const overlapping = ranges.filter((part) => part.start < end && part.end > start);
    const contextOnly = overlapping.every(
      (part) => part.id === 'context' || part.id.startsWith('context:'),
    );
    const id = contextOnly
      ? `word:context:${contextIndex++}`
      : mode === 'noun'
        ? 'word:noun'
        : 'word:verb';
    const segments = slicedSegments(current, start, end);
    let meaning;
    let description;
    let selector = null;
    let familyId = null;
    if (contextOnly) {
      const tokenIndex = contextIndex - 1;
      if (overlapping.length === 1) {
        const latinWords = overlapping[0].latin.trim().split(/\s+/u);
        segments[0].latin = latinWords[tokenIndex] || latinWords[0];
      }
      if (mode === 'noun' && context?.familyId === 'pointing') {
        const far = context.id === 'that';
        meaning =
          tokenIndex === 0
            ? nounState.number === 'singular'
              ? far
                ? 'That'
                : 'This'
              : far
                ? 'Those'
                : 'These'
            : {
                هُوَ: 'he / it',
                هِيَ: 'she / it',
                هُمَا: 'the two of them',
                هُمْ: 'they',
                هُنَّ: 'they',
              }[word[0]] || 'linking pronoun';
        description =
          tokenIndex === 0
            ? 'A pointing word. Its shape matches the thing or things you point to. English adds “is” or “are” in the full sentence.'
            : 'This pronoun separates the two definite parts and makes the sentence clear. It is not a general-purpose Arabic word for “is”.';
        selector = tokenIndex === 0 ? 'context' : null;
        familyId = tokenIndex === 0 ? 'pointing' : null;
      } else {
        meaning = mode === 'noun' ? context?.label.replace('…', '') : trim(overlapping[0].label);
        description = context?.description || overlapping[0].meaning;
        selector = mode === 'noun' ? 'context' : 'tense';
        familyId = context?.familyId || 'actions';
      }
    } else {
      meaning =
        mode === 'noun'
          ? current.englishParts
              .filter((part) => part.id !== 'context' && !part.id.startsWith('context:'))
              .map((part) => part.text)
              .join('')
              .trim()
          : verbState.tenseId.startsWith('negative_')
            ? buildVerb({
                ...verbState,
                tenseId: verbState.tenseId === 'negative_past' ? 'past' : 'present',
              }).translation
            : current.translation;
      description =
        mode === 'noun'
          ? 'One Arabic word can contain the thing and an attached owner. Expand it to see the actual pieces.'
          : 'The action and who does it can fit in one Arabic word. Expand it to see its real beginning and ending.';
      familyId = mode === 'verb' ? 'actions' : null;
    }
    const node = add({
      id,
      kind: 'word',
      parentId: 'sentence',
      arabic: word[0],
      latin: segments.map((part) => part.latin).join(''),
      meaning,
      sourceStart: start,
      sourceEnd: end,
      segments,
      selector,
      familyId,
      description,
    });
    wordIds.push(id);
    if (contextOnly && mode === 'noun' && context?.actionParts) {
      let offset = start;
      for (const part of context.actionParts) {
        add({
          id: `part:context:${part.id}`,
          kind: 'part',
          parentId: id,
          arabic: part.arabic,
          latin: part.latin,
          meaning: part.meaning,
          sourceStart: offset,
          sourceEnd: offset + part.arabic.length,
          segments: [{ ...part, id: `context:${part.id}` }],
          selector: part.id === 'stem' ? 'context' : null,
          familyId: 'actions',
          description:
            part.id === 'ending'
              ? 'The whole -tu ending tells us “I did it”. These short action examples keep the speaker as I.'
              : 'The action part in this checked past-tense form. Choose another action from the Actions family.',
        });
        offset += part.arabic.length;
      }
    } else if (!contextOnly) {
      for (const part of overlapping) {
        const partStart = Math.max(start, part.start);
        const partEnd = Math.min(end, part.end);
        add({
          id: `part:${part.id}`,
          kind: 'part',
          parentId: node.id,
          arabic: current.arabic.slice(partStart, partEnd),
          latin: part.latin.trim(),
          meaning: part.label,
          sourceStart: partStart,
          sourceEnd: partEnd,
          segments: slicedSegments(current, partStart, partEnd),
          selector: selectorFor(part.id, mode),
          familyId: mode === 'verb' ? 'actions' : null,
          description: partDescription(part, state, mode),
        });
      }
    }
  }
  const model = {
    mode,
    state,
    result: current,
    rootId: 'sentence',
    nodes,
    wordIds,
    structureEdges,
    ruleEdges: [],
    families: mode === 'noun' ? familyOptions(nounState) : [],
  };
  model.ruleEdges = nounRules(model, context);
  return model;
}

function nounRules(model, context) {
  if (model.mode !== 'noun') return [];
  const { nodes, state, result } = model;
  const get = (id) => nodes.find((node) => node.id === id);
  const rules = [];
  const add = (id, from, to, label, description, effect = 'changes') => {
    if (!get(from) || !get(to)) return;
    const target = get(to);
    rules.push({
      id,
      from,
      to,
      type: 'rule',
      label,
      description,
      effect,
      sourceIndices: rangeIndices(get(from).sourceStart, get(from).sourceEnd),
      targetSourceIndices: rangeIndices(target.sourceStart, target.sourceEnd),
    });
  };
  const contextWord = get('word:context:0');
  const roleSource = context?.familyId === 'pointing' || !contextWord ? 'sentence' : contextWord.id;
  const casePart = get('part:case');
  const numberPart = get('part:number');
  const ownerPart = get('part:owner');
  if (casePart) {
    const noun = entry(NOUNS, state.nounId);
    let description =
      context?.caseKey === 'i'
        ? `After ${context.latin}, the noun uses the after-location form. An ordinary singular shows i here.`
        : context?.caseKey === 'a'
          ? `The noun names ${context.objectDescription}. An ordinary singular shows a here.`
          : 'In this identifying pattern the noun names what this or that is. An ordinary singular shows u. The sentence role chooses this form; hādhā is not a preposition.';
    if (state.contextId === 'phrase')
      description =
        'This standalone comparison uses the u-form. A surrounding sentence would determine the noun’s job.';
    if (state.number === 'plural' && noun.plural?.type === 'sound_f' && context.caseKey === 'a')
      description += ' This -āt plural instead shows i for that same action role.';
    if (state.number === 'plural' && noun.plural?.diptote && !result.grammar.isDefinite)
      description +=
        ' This recorded plural uses a after a location word until “the” or an owner is attached.';
    add('noun-role', roleSource, casePart.id, `The phrase chooses ${casePart.latin}`, description);
  } else if (numberPart) {
    add(
      'number-role',
      roleSource,
      numberPart.id,
      'The phrase chooses this number ending',
      state.number === 'dual'
        ? 'Two uses āni in the pointing pattern and ayni after a location word or these actions. Attaching an owner removes the final n-sound.'
        : 'This people-plural ending uses ūna in the pointing pattern and īna after a location word or these actions. Attaching an owner removes the final n-sound.',
    );
  } else if (ownerPart && state.ownerId === 'my') {
    add(
      'joined-my-role',
      roleSource,
      ownerPart.id,
      state.number === 'dual'
        ? 'The role changes the joined two + my ending'
        : 'The role changes; this my ending stays',
      ownerPart.description,
      state.number === 'dual' ? 'changes' : 'unchanged',
    );
  }
  if (ownerPart && state.ownerId !== 'my') {
    const owner = entry(OWNERS, state.ownerId);
    if (owner.softArabic && ownerPart.arabic === owner.softArabic) {
      add(
        'owner-sound',
        (casePart || numberPart)?.id,
        ownerPart.id,
        `${owner.latin} → ${owner.softLatin}`,
        `After an i-sound or a still y-sound, ${owner.latin} becomes ${owner.softLatin}. It still means ${owner.english}; the owner has not changed.`,
        'sound-change',
      );
      const rule = rules.at(-1);
      if (rule?.id === 'owner-sound')
        rule.targetSourceIndices = rangeIndices(ownerPart.sourceStart, ownerPart.sourceEnd).filter(
          (index) => result.arabic[index] === 'ِ',
        );
    }
  }
  if (context?.familyId === 'pointing' && contextWord) {
    const noun = entry(NOUNS, state.nounId);
    const description =
      state.number === 'plural' && !noun.human
        ? 'For a group of nonhuman things, this pattern normally uses hādhihi or tilka. The English still says these or those.'
        : state.number === 'dual'
          ? 'Two things use a two-item pointing form. Its shape also matches the Arabic word’s gender.'
          : state.number === 'plural'
            ? 'A group of people uses hāʾulāʾ nearby or ulāʾika farther away.'
            : `Arabic treats ${noun.english} as ${noun.gender === 'f' ? 'feminine' : 'masculine'}, so the pointing word uses the matching form.`;
    add(
      'pointing-agreement',
      'word:noun',
      contextWord.id,
      'The pointing word matches the noun',
      description,
      'agreement',
    );
  }
  const noun = entry(NOUNS, state.nounId);
  if (
    state.number !== 'plural' &&
    noun.arabic.endsWith('ة') &&
    (ownerPart || state.number === 'dual') &&
    get('part:stem')?.arabic.endsWith('ت')
  )
    add(
      'open-ta',
      (ownerPart || numberPart).id,
      'part:stem',
      'The attached ending opens ة into ت',
      'Before an owner or a two-item ending, the word’s final ة is written ت. That t remains part of the word itself.',
    );
  return rules;
}

/** Exact source slices keep original segment IDs; use source ranges to crop the
 * original shaped word when displaying an attached ending on its own. */
export function getExplorerNodeResult(model, nodeId) {
  const node = model.nodes.find((item) => item.id === nodeId);
  if (!node) return null;
  if (node.kind === 'sentence') return model.result;
  return {
    arabic: node.arabic,
    latin: node.latin,
    wordArabic: node.arabic,
    wordLatin: node.latin,
    translation: node.meaning,
    segments: node.segments,
    englishParts: [{ id: node.segmentIds[0] || 'stem', text: node.meaning }],
    notes: [{ title: node.meaning, body: node.description }],
    grammar: model.result.grammar,
    sourceStart: node.sourceStart,
    sourceEnd: node.sourceEnd,
  };
}

export function explainExplorerMark(model, sourceIndex) {
  const character = model.result.arabic[sourceIndex];
  const mark = HARAKAT[character];
  if (!mark) return null;
  const containing = model.nodes.filter(
    (node) =>
      node.kind !== 'sentence' && node.sourceStart <= sourceIndex && sourceIndex < node.sourceEnd,
  );
  const node = containing.find((item) => item.kind === 'part') || containing[0];
  if (!node) return null;
  const word = model.nodes.find(
    (item) =>
      item.kind === 'word' && item.sourceStart <= sourceIndex && sourceIndex < item.sourceEnd,
  );
  const role = node.id.startsWith('part:context:')
    ? node.id.split(':').at(-1)
    : tail(node.segmentIds[0] || '');
  let kind = 'word-sound';
  let body = `This ${mark.sound} sound belongs inside ${word?.latin || node.latin}. The whole word carries its meaning. Choose another checked word or family to change it.`;
  let selector = node.selector || (model.mode === 'noun' && node.familyId ? 'context' : 'stem');
  let examples = [];
  if (role === 'case') {
    kind = 'case';
    if (model.mode === 'noun') {
      body =
        model.ruleEdges.find((rule) => rule.id === 'noun-role')?.description || node.description;
      examples = model.families.flatMap((family) =>
        family.options
          .filter((option) => !option.disabled)
          .map((option) => ({
            label: option.label,
            result: option.result,
            familyId: family.id,
            patch: option.patch,
          })),
      );
    } else {
      body = node.description;
      examples = ['past', 'present', 'future'].map((tenseId) => ({
        label: { past: 'Happened', present: 'Now / usually', future: 'Will happen' }[tenseId],
        result: buildVerb({ ...model.state, tenseId }),
      }));
    }
  } else if (role === 'owner') {
    kind = 'owner';
    selector = 'owner';
    const owner = entry(OWNERS, model.state.ownerId);
    body =
      model.state.ownerId === 'my'
        ? model.state.number === 'dual' || node.latin === 'iyya'
          ? node.description
          : 'The kasra and yāʾ together make the long ī sound. This whole ending means my. There is no separate visible case vowel before ī, even when the sentence gives the noun a different job.'
        : `This mark is one sound inside ${node.latin}, the ending for ${owner.english}. It does not mean ${owner.english} by itself. ${model.ruleEdges.find((rule) => rule.id === 'owner-sound')?.description || 'The whole ending tells us whose.'}`;
    examples = ['this', 'in', 'saw'].map((contextId) => ({
      label: entry(CONTEXTS, contextId).label.replace('…', ''),
      result: buildNoun({ ...model.state, contextId }),
    }));
  } else if (['prefix', 'ending'].includes(role)) {
    kind = 'person';
    body = node.description;
    selector = node.id.startsWith('part:context:') ? 'context' : 'person';
  } else if (role === 'number') {
    body = node.description;
    selector = 'number';
  }
  return {
    nodeId: node.id,
    wordId: word?.id,
    selector,
    kind,
    title: `${mark.name} · ${mark.sound}`,
    body,
    ruleIds: model.ruleEdges
      .filter((rule) => rule.from === node.id || rule.to === node.id)
      .map((rule) => rule.id),
    sourceIndex,
    character,
    mark: mark.id,
    examples,
  };
}
