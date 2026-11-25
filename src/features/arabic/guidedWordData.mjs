import { buildNoun, buildVerb, NOUNS, OWNERS, VERBS, PERSONS } from './grammar.mjs';
import { HARAKAT } from './arabicGlyphModel.mjs';
import { segmentRanges } from './arabicConnectionModel.mjs';

export const GUIDED_WORD_TYPES = [
  { id: 'pointing', label: 'Pointing words', description: 'This and that, one word at a time.' },
  {
    id: 'noun',
    label: 'Things and people',
    description: 'Choose a word, then explore its endings.',
  },
  { id: 'verb', label: 'Actions', description: 'Say what someone does, or did.' },
];

export const POINTING_WORDS = [
  {
    id: 'this_m',
    label: 'This · masculine',
    english: 'This',
    arabic: 'هَذَا',
    latin: 'hādhā',
    distance: 'near',
    gender: 'm',
    aliases: ['this', 'hadha', 'hatha'],
    description:
      'Point to one nearby thing whose Arabic word is masculine. The whole word means this; it does not mean is.',
    sounds: [
      ['هَ', 'hā'],
      ['ذَا', 'dhā'],
    ],
  },
  {
    id: 'this_f',
    label: 'This · feminine',
    english: 'This',
    arabic: 'هَذِهِ',
    latin: 'hādhihi',
    distance: 'near',
    gender: 'f',
    aliases: ['this', 'hadhihi', 'hathihi'],
    description:
      'Point to one nearby thing whose Arabic word is feminine. These spelling sounds stay fixed in this word.',
    sounds: [
      ['هَ', 'hā'],
      ['ذِ', 'dhi'],
      ['هِ', 'hi'],
    ],
  },
  {
    id: 'that_m',
    label: 'That · masculine',
    english: 'That',
    arabic: 'ذَلِكَ',
    latin: 'dhālika',
    distance: 'far',
    gender: 'm',
    aliases: ['that', 'dhalika', 'thalika'],
    description:
      'Point to one farther-away thing whose Arabic word is masculine. Its final ka is part of this pointing word, not a noun’s your ending.',
    sounds: [
      ['ذَ', 'dhā'],
      ['لِ', 'li'],
      ['كَ', 'ka'],
    ],
  },
  {
    id: 'that_f',
    label: 'That · feminine',
    english: 'That',
    arabic: 'تِلْكَ',
    latin: 'tilka',
    distance: 'far',
    gender: 'f',
    aliases: ['that', 'tilka'],
    description:
      'Point to one farther-away thing whose Arabic word is feminine. The whole word means that.',
    sounds: [
      ['تِلْ', 'til'],
      ['كَ', 'ka'],
    ],
  },
];

export const INITIAL_GUIDED_SELECTION = Object.freeze({
  type: 'pointing',
  pointingId: 'this_m',
  nounId: 'bayt',
  ownerId: 'none',
  number: 'singular',
  definiteness: 'indefinite',
  verbId: 'kataba',
  personId: 'i',
  tenseId: 'present',
});

const tail = (id) => id.split(':').at(-1);
const allIndices = (start, end) => Array.from({ length: end - start }, (_, index) => start + index);
const normaliseSearch = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[ʾʿ’'‘ʼ`]/gu, '')
    .replace(/[أإآٱ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/ـ/gu, '');

/** One search contract for both word and sentence pickers, including aliases. */
export function searchVocabulary(options, query = '') {
  const terms = normaliseSearch(query).trim().split(/\s+/u).filter(Boolean);
  if (!terms.length) return options;
  return options.filter((option) => {
    const text = normaliseSearch(
      [
        option.id,
        option.label,
        option.english,
        option.arabic,
        option.latin,
        option.root,
        option.category,
        ...(option.aliases || []),
      ]
        .filter(Boolean)
        .join(' '),
    );
    return terms.every((term) => text.includes(term));
  });
}

function pointingResult(entry) {
  const segments = entry.sounds.map(([arabic, latin], index) => ({
    id: `pointing:${index}:context`,
    arabic,
    latin,
    label: `Sound: ${latin}`,
    meaning: 'A sound inside a fixed pointing word, not a separate meaning.',
  }));
  return {
    arabic: entry.arabic,
    latin: entry.latin,
    translation: entry.english,
    wordArabic: entry.arabic,
    wordLatin: entry.latin,
    segments,
    englishParts: [{ id: 'word', text: entry.english }],
    notes: [{ title: 'One fixed pointing word', body: entry.description }],
    grammar: { wordType: 'pointing', pointingId: entry.id, fixed: true, supported: true },
  };
}

function partBody(part, type, selection) {
  const key = tail(part.id);
  if (type === 'pointing')
    return 'This is a reading sound inside the whole pointing word. It is not a separate word or meaning, and these vowels do not switch to show a noun’s sentence job.';
  if (key === 'stem')
    return 'This piece carries the main word meaning. Its letters and inner sounds belong to the recorded word.';
  if (key === 'case') {
    if (type === 'verb')
      return 'This is the ordinary present-form ending here. It does not mean he; the verb’s person information is in its beginning and sometimes its ending.';
    const forms = ['phrase', 'in', 'saw'].map(
      (contextId) => buildNoun({ ...selection, contextId }).wordLatin,
    );
    return `This one-word view shows ${part.latin}. The phrase chooses the sound: ${forms[0]} here, ${forms[1]} after “in”, and ${forms[2]} for the thing I saw.`;
  }
  if (key === 'owner' && selection.ownerId === 'my') {
    if (selection.number === 'dual')
      return 'Two and my have joined into one ending. The phrase can change āya to ayya; they are not separate pieces here.';
    if (part.latin === 'iyya')
      return 'The people-plural ending and my join into iyya. This is one combined ending.';
    return 'The kasra and yāʾ make the long ī ending, meaning my. There is no extra visible u, a, or i before it.';
  }
  if (key === 'owner' && selection.ownerId === 'our')
    return 'Nūn gives n. Fatḥa plus the following alif makes long ā. The whole nā ending means our; the alif alone does not.';
  if (key === 'ending' && selection.personId === 'we' && selection.tenseId === 'past')
    return 'In this past verb, the whole nā ending means we. Nūn gives n; fatḥa plus alif gives long ā. This is the doer ending, not a noun’s our ending.';
  if (key === 'owner')
    return `The whole ${part.latin} ending says whose, or who the thing is connected to. Its individual letters and vowels are sounds within that ending.`;
  if (key === 'prefix' || key === 'ending')
    return `This piece helps tell us who acts. ${part.meaning || ''} The whole beginning or ending carries that information, not a vowel alone.`;
  if (key === 'number')
    return 'This one ending shows a count and also changes with the phrase. It is kept together here.';
  if (key === 'article')
    return 'Al- makes this a particular noun: the. An attached owner already identifies the noun.';
  return part.meaning || part.label;
}

export function buildGuidedWord(input = {}) {
  const selection = { ...INITIAL_GUIDED_SELECTION, ...input };
  let result;
  let summary;
  let entryId;
  let sentencePatch;
  if (selection.type === 'pointing') {
    const entry = POINTING_WORDS.find((word) => word.id === selection.pointingId);
    if (!entry) throw new RangeError(`Unknown pointing word: ${selection.pointingId}`);
    result = pointingResult(entry);
    summary = entry.description;
    entryId = entry.id;
    sentencePatch = {
      mode: 'noun',
      nounId: entry.gender === 'f' ? 'madrasah' : 'bayt',
      ownerId: 'my',
      number: 'singular',
      definiteness: 'indefinite',
      contextId: entry.distance === 'far' ? 'that' : 'this',
    };
  } else if (selection.type === 'noun') {
    result = buildNoun({ ...selection, contextId: 'phrase' });
    summary = `Study ${result.latin}, “${result.translation.toLowerCase()}”. Tap its letters or an ending. Then use this same word in a sentence to see what changes.`;
    entryId = selection.nounId;
    sentencePatch = {
      mode: 'noun',
      nounId: selection.nounId,
      ownerId: selection.ownerId,
      number: selection.number,
      definiteness: selection.definiteness,
      contextId: 'this',
    };
  } else if (selection.type === 'verb') {
    if (!['past', 'present'].includes(selection.tenseId))
      throw new RangeError('The word guide offers checked past and present action forms.');
    result = buildVerb(selection);
    summary =
      'One Arabic action word can say both the action and who does it. Compare its checked present and past forms.';
    entryId = selection.verbId;
    sentencePatch = {
      mode: 'verb',
      verbId: selection.verbId,
      personId: selection.personId,
      tenseId: selection.tenseId,
    };
  } else throw new RangeError(`Unknown guided word type: ${selection.type}`);
  const parts = segmentRanges(result).map((part) => ({
    id: part.id,
    partId: part.id,
    sourceStart: part.start,
    sourceEnd: part.end,
    arabic: part.arabic,
    latin: part.latin,
    title: part.label,
    body: partBody(part, selection.type, selection),
    kind: selection.type === 'pointing' ? 'fixed-word' : tail(part.id),
    fixed: selection.type === 'pointing' || tail(part.id) === 'stem',
  }));
  return {
    ...result,
    study: { type: selection.type, entryId, selection, summary, parts, sentencePatch },
  };
}

const LETTER_NAMES = {
  ا: 'Alif',
  أ: 'Alif with hamza',
  إ: 'Alif with hamza',
  ب: 'Bāʾ',
  ت: 'Tāʾ',
  ث: 'Thāʾ',
  ج: 'Jīm',
  ح: 'Ḥāʾ',
  خ: 'Khāʾ',
  د: 'Dāl',
  ذ: 'Dhāl',
  ر: 'Rāʾ',
  ز: 'Zāy',
  س: 'Sīn',
  ش: 'Shīn',
  ص: 'Ṣād',
  ض: 'Ḍād',
  ط: 'Ṭāʾ',
  ظ: 'Ẓāʾ',
  ع: 'ʿAyn',
  غ: 'Ghayn',
  ف: 'Fāʾ',
  ق: 'Qāf',
  ك: 'Kāf',
  ل: 'Lām',
  م: 'Mīm',
  ن: 'Nūn',
  ه: 'Hāʾ',
  و: 'Wāw',
  ي: 'Yāʾ',
  ة: 'Tāʾ marbūṭah',
  ء: 'Hamza',
  ؤ: 'Hamza on wāw',
  ئ: 'Hamza on yāʾ',
};

export function explainGuidedWordPart(result, target) {
  if (!result?.study) return null;
  const sourceIndex = typeof target === 'number' ? target : target?.sourceIndex;
  const partId = typeof target === 'string' ? target : target?.partId;
  const part =
    sourceIndex != null
      ? result.study.parts.find(
          (item) => item.sourceStart <= sourceIndex && sourceIndex < item.sourceEnd,
        )
      : result.study.parts.find((item) => item.id === partId || item.partId === partId);
  if (!part) return null;
  const detail = {
    title: part.title,
    body: part.body,
    kind: part.kind,
    fixed: part.fixed,
    sourceIndices: allIndices(part.sourceStart, part.sourceEnd),
    examples: [],
  };
  if (sourceIndex == null) return detail;
  const character = result.arabic[sourceIndex];
  const mark = HARAKAT[character];
  const key = tail(part.partId);
  const selection = result.study.selection;
  detail.sourceIndices = [sourceIndex];
  detail.title = mark ? `${mark.name} · ${mark.sound}` : LETTER_NAMES[character] || 'Letter';
  detail.kind = mark ? (['sukun', 'shadda'].includes(mark.id) ? 'mark' : 'short-vowel') : 'letter';
  detail.fixed = result.study.type === 'pointing' || !['case', 'number'].includes(key);
  if (result.study.type === 'pointing') {
    if (sourceIndex <= 1 && selection.pointingId !== 'that_f') {
      detail.title =
        selection.pointingId === 'that_m' ? 'The first sound: dhā' : 'The first sound: hā';
      detail.body =
        'This familiar word has a long ā here even though ordinary spelling omits a full alif. Some fully marked printing shows a small alif above the letter. Learn this fixed spelling with its pronunciation.';
    } else if (character === 'ا' || (character === 'َ' && result.arabic[sourceIndex + 1] === 'ا')) {
      detail.title = 'Fatḥa + alif → long ā';
      detail.body =
        'The short a mark followed by alif makes a long ā sound. This is a spelling sound in hādhā; the whole word means this.';
    } else {
      detail.body = mark
        ? `${mark.name} supplies ${mark.sound === 'no vowel after this letter' ? 'no short vowel after the letter' : `the ${mark.sound} sound`} here. It stays as part of this fixed pointing word; it is not a changing noun-case ending.`
        : `${detail.title} is a letter inside ${result.latin}. The complete pointing word means ${result.translation.toLowerCase()}; this letter has no separate English meaning here.`;
    }
    return detail;
  }
  if (key === 'case') {
    detail.kind = 'case';
    detail.body = part.body;
    if (result.study.type === 'noun')
      detail.examples = ['this', 'in', 'saw'].map((contextId) =>
        buildNoun({ ...selection, contextId }),
      );
    return detail;
  }
  let vowelIndex = null;
  let vowelKind = null;
  if (character === 'ا' && result.arabic[sourceIndex - 1] === 'َ') {
    vowelIndex = sourceIndex - 1;
    vowelKind = 'ā';
  } else if (character === 'َ' && result.arabic[sourceIndex + 1] === 'ا') {
    vowelIndex = sourceIndex;
    vowelKind = 'ā';
  } else if (
    character === 'ي' &&
    result.arabic[sourceIndex - 1] === 'ِ' &&
    !HARAKAT[result.arabic[sourceIndex + 1]]
  ) {
    vowelIndex = sourceIndex - 1;
    vowelKind = 'ī';
  } else if (
    character === 'ِ' &&
    result.arabic[sourceIndex + 1] === 'ي' &&
    !HARAKAT[result.arabic[sourceIndex + 2]]
  ) {
    vowelIndex = sourceIndex;
    vowelKind = 'ī';
  } else if (
    character === 'و' &&
    result.arabic[sourceIndex - 1] === 'ُ' &&
    !HARAKAT[result.arabic[sourceIndex + 1]]
  ) {
    vowelIndex = sourceIndex - 1;
    vowelKind = 'ū';
  } else if (
    character === 'ُ' &&
    result.arabic[sourceIndex + 1] === 'و' &&
    !HARAKAT[result.arabic[sourceIndex + 2]]
  ) {
    vowelIndex = sourceIndex;
    vowelKind = 'ū';
  }
  if (vowelKind) {
    detail.kind = 'long-vowel';
    detail.sourceIndices = [vowelIndex, vowelIndex + 1];
    detail.title = {
      ā: 'Fatḥa + alif → long ā',
      ī: 'Kasra + yāʾ → long ī',
      ū: 'Ḍamma + wāw → long ū',
    }[vowelKind];
    detail.body =
      vowelKind === 'ā'
        ? 'Fatḥa is a short a. The following alif lengthens it to ā; the alif is not another separate a.'
        : vowelKind === 'ī'
          ? 'Kasra is a short i. The following still yāʾ lengthens it to ī.'
          : 'Ḍamma is a short u. The following still wāw lengthens it to ū.';
    if (key === 'owner' && selection.ownerId === 'our')
      detail.body +=
        ' Together with nūn, this gives nā. The whole nā ending means our; the alif alone does not.';
    else if (key === 'ending' && selection.personId === 'we')
      detail.body +=
        ' Together with nūn, this gives nā. In this past verb, the whole nā ending means we.';
    else if (key === 'owner' && selection.ownerId === 'my')
      detail.body += ' Here the whole ī ending means my. No extra case vowel is added before it.';
    return detail;
  }
  if (key === 'owner' || key === 'prefix' || key === 'ending') {
    detail.kind = key === 'owner' ? 'ending' : 'person';
    detail.body = `${mark ? `${mark.name} supplies the ${mark.sound} sound within this piece. ` : `${detail.title} is one letter in this piece. `}${part.body}`;
  } else if (mark) {
    detail.body = `${mark.name} supplies ${mark.sound === 'no vowel after this letter' ? 'no short vowel after the letter' : `the ${mark.sound} sound`}. This inner sound belongs to the recorded word; it is not the sentence ending.`;
  } else detail.body = `${detail.title} belongs to the word’s spelling. ${part.body}`;
  return detail;
}

const resultCell = (result) => ({ text: result.latin, result });
const soundCell = (result, sequence, last = false) => ({
  ...resultCell(result),
  sourceIndex: last ? result.arabic.lastIndexOf(sequence) : result.arabic.indexOf(sequence),
});
const pointerCell = (pointingId) => resultCell(buildGuidedWord({ pointingId }));
const sampleNoun = (ownerId, nounId = 'bayt') => buildGuidedWord({ type: 'noun', nounId, ownerId });
const sampleVerb = (verbId, personId, tenseId) =>
  buildGuidedWord({ type: 'verb', verbId, personId, tenseId });

export const GUIDED_REFERENCE_TABLES = [
  {
    id: 'sounds',
    shortLabel: 'Sounds',
    title: 'Small marks and long sounds',
    intro: 'A mark gives a sound. A whole word or ending carries the meaning.',
    columns: ['Sound', 'How it is written', 'Example'],
    rows: [
      [
        'a · fatḥa',
        'A short mark above the letter',
        soundCell(sampleNoun('your_m', 'kitab'), 'َ', true),
      ],
      ['u · ḍamma', 'A small curl above the letter', soundCell(sampleNoun('our'), 'ُ')],
      [
        'i · kasra',
        'A short mark below the letter',
        soundCell(sampleNoun('your_f', 'kitab'), 'ِ', true),
      ],
      ['ā · long a', 'Fatḥa followed by alif', soundCell(sampleNoun('our'), 'َا')],
      ['ī · long i', 'Kasra followed by still yāʾ', soundCell(sampleNoun('my'), 'ِي')],
      [
        'ū · long u',
        'Ḍamma followed by still wāw',
        soundCell(
          buildGuidedWord({ type: 'noun', nounId: 'bayt', ownerId: 'our', number: 'plural' }),
          'ُو',
        ),
      ],
      [
        'No short vowel · sukūn',
        'A small circle above the letter',
        soundCell(sampleNoun('my'), 'ْ'),
      ],
      [
        'Double the consonant · shadda',
        'A small w-shaped mark',
        soundCell(sampleNoun('my', 'muallim'), 'ّ'),
      ],
    ],
    note: 'Pointing-word vowels stay fixed. A noun’s sentence ending can change for its job.',
  },
  {
    id: 'owners',
    shortLabel: 'Endings',
    title: 'Whose ending is it?',
    intro: 'The whole attached ending says whose. The word’s own final letter stays with the word.',
    columns: ['Meaning', 'Ending sound', 'A complete word'],
    rows: ['my', 'your_m', 'your_f', 'his', 'her', 'our'].map((ownerId) => {
      const owner = OWNERS.find((item) => item.id === ownerId);
      return [owner.label, owner.latin, resultCell(sampleNoun(ownerId))];
    }),
    note: 'After an i-sound, his hu becomes hi. My ī occupies the visible ending; do not insert another case vowel.',
  },
  {
    id: 'pointing',
    shortLabel: 'This / that',
    title: 'Point to one thing',
    intro:
      'Choose the form that matches the Arabic noun. The word itself means this or that, not is.',
    columns: ['Where?', 'Masculine word', 'Feminine word'],
    rows: [
      ['Near · this', pointerCell('this_m'), pointerCell('this_f')],
      ['Far · that', pointerCell('that_m'), pointerCell('that_f')],
    ],
    note: 'The sentence builder also matches two-item and plural forms. These four word-study entries are singular.',
  },
  {
    id: 'verbs',
    shortLabel: 'Now / before',
    title: 'Useful present and past pairs',
    intro: 'Use the recorded pair. A verb’s middle vowel cannot always be guessed from its root.',
    columns: ['Who / action', 'Now / usually', 'Happened'],
    rows: [
      ...['i', 'we', 'you_m', 'you_f', 'he', 'she'].map((personId) => [
        `${PERSONS.find((person) => person.id === personId).label} · write`,
        resultCell(sampleVerb('kataba', personId, 'present')),
        resultCell(sampleVerb('kataba', personId, 'past')),
      ]),
      ...['darasa', 'shariba', 'dhahaba', 'fahima', 'amila'].map((verbId) => [
        `I · ${VERBS.find((verb) => verb.id === verbId).english}`,
        resultCell(sampleVerb(verbId, 'i', 'present')),
        resultCell(sampleVerb(verbId, 'i', 'past')),
      ]),
    ],
    note: 'You forms distinguish speaking to one man or one woman. I and we do not change with gender.',
  },
];

/** Canonical guide inventory consumed by the local glyph-atlas generator. */
export function guidedGlyphResults() {
  return [
    ...POINTING_WORDS.map((entry) => buildGuidedWord({ pointingId: entry.id })),
    ...NOUNS.map((entry) => buildGuidedWord({ type: 'noun', nounId: entry.id })),
    ...GUIDED_REFERENCE_TABLES.flatMap((table) =>
      table.rows.flatMap((row) =>
        row.filter((cell) => typeof cell === 'object' && cell.result).map((cell) => cell.result),
      ),
    ),
  ];
}
