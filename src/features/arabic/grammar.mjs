import {
  NOUNS,
  OWNERS,
  CONTEXTS,
  NUMBERS,
  DEFINITENESS,
  VERBS,
  PERSONS,
  TENSES,
} from './vocabulary.mjs';
export {
  NOUNS,
  OWNERS,
  CONTEXTS,
  NUMBERS,
  DEFINITENESS,
  VERBS,
  PERSONS,
  TENSES,
  SEGMENT_LABELS,
} from './vocabulary.mjs';

const VOWELS = { u: 'ُ', a: 'َ', i: 'ِ' };
const TANWIN = { u: 'ٌ', a: 'ً', i: 'ٍ' };
const CASE_NAMES = { u: 'nominative · مرفوع', a: 'accusative · منصوب', i: 'genitive · مجرور' };
const SUN_LETTERS = {
  ت: 't',
  ث: 'th',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 'ṣ',
  ض: 'ḍ',
  ط: 'ṭ',
  ظ: 'ẓ',
  ل: 'l',
  ن: 'n',
};
const find = (options, id, kind) => {
  const item = options.find((option) => option.id === id);
  if (!item) throw new RangeError(`Unknown ${kind}: ${id}`);
  return item;
};
const piece = (id, arabic, latin, label, meaning) => ({ id, arabic, latin, label, meaning });
const note = (title, body) => ({ title, body });
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const join = (segments, key) => segments.map((part) => part[key]).join('');
const spokenStem = (arabic, latin) => (arabic.endsWith('ة') ? latin.replace(/h$/, 't') : latin);
const attachedStem = (arabic) => (arabic.endsWith('ة') ? `${arabic.slice(0, -1)}ت` : arabic);

export function getAvailableNumbers(nounId) {
  const noun = find(NOUNS, nounId, 'noun');
  return NUMBERS.filter((number) => number.id !== 'plural' || noun.plural);
}

function demonstrative(noun, number, distant = false) {
  if (number === 'dual')
    return noun.gender === 'f'
      ? {
          arabic: distant ? 'تَانِكَ' : 'هَاتَانِ',
          latin: distant ? 'tānika' : 'hātāni',
          pronounArabic: 'هُمَا',
          pronounLatin: 'humā',
        }
      : {
          arabic: distant ? 'ذَانِكَ' : 'هَذَانِ',
          latin: distant ? 'dhānika' : 'hādhāni',
          pronounArabic: 'هُمَا',
          pronounLatin: 'humā',
        };
  if (number === 'plural' && noun.human)
    return {
      arabic: distant ? 'أُولَئِكَ' : 'هَؤُلَاءِ',
      latin: distant ? 'ulāʾika' : 'hāʾulāʾ',
      pronounArabic: noun.gender === 'f' ? 'هُنَّ' : 'هُمْ',
      pronounLatin: noun.gender === 'f' ? 'hunna' : 'hum',
    };
  if (noun.gender === 'f' || number === 'plural')
    return {
      arabic: distant ? 'تِلْكَ' : 'هَذِهِ',
      latin: distant ? 'tilka' : 'hādhihi',
      pronounArabic: 'هِيَ',
      pronounLatin: 'hiya',
    };
  return {
    arabic: distant ? 'ذَلِكَ' : 'هَذَا',
    latin: distant ? 'dhālika' : 'hādhā',
    pronounArabic: 'هُوَ',
    pronounLatin: 'huwa',
  };
}

function nounEnglish(noun, owner, context, number, definite) {
  const parts = [];
  const beginnings = {
    this: number === 'singular' ? 'This is ' : 'These are ',
    that: number === 'singular' ? 'That is ' : 'Those are ',
    in: 'In ',
    from: 'From ',
    to: 'To ',
    phrase: '',
  };
  const beginning = beginnings[context.id] || (context.english ? `${context.english} ` : '');
  if (beginning) parts.push({ id: 'context', text: beginning });
  if (owner.id !== 'none') parts.push({ id: 'owner', text: `${owner.english} ` });
  else if (definite) parts.push({ id: 'article', text: 'the ' });
  else if (number === 'singular')
    parts.push({ id: 'article', text: /^[aeiou]/i.test(noun.english) ? 'an ' : 'a ' });
  else if (number === 'plural') parts.push({ id: 'article', text: 'some ' });
  if (number === 'dual') parts.push({ id: 'number', text: 'two ' });
  const nounText =
    number === 'singular' ? noun.english : noun.plural?.english || `${noun.english}s`;
  parts.push({ id: 'stem', text: nounText });
  if (context.id === 'phrase') parts[0] = { ...parts[0], text: capitalise(parts[0].text) };
  return parts;
}

/** Build only supported, curated combinations. Arabic/Latin segment strings join verbatim. */
export function buildNoun({
  nounId = 'bayt',
  ownerId = 'our',
  contextId = 'this',
  number = 'singular',
  definiteness = 'indefinite',
} = {}) {
  const noun = find(NOUNS, nounId, 'noun');
  const owner = find(OWNERS, ownerId, 'owner');
  const context = find(CONTEXTS, contextId, 'context');
  find(NUMBERS, number, 'number');
  find(DEFINITENESS, definiteness, 'definiteness');
  if (!getAvailableNumbers(nounId).some((entry) => entry.id === number))
    throw new RangeError(`The ${number} form of ${nounId} is not in the checked vocabulary.`);

  const caseKey = context.caseKey;
  const hasOwner = owner.id !== 'none';
  const article = !hasOwner && definiteness === 'definite';
  const isDefinite = hasOwner || article;
  const isPlural = number === 'plural';
  const form = isPlural
    ? noun.plural
    : { arabic: noun.arabic, latin: noun.latin, type: 'singular' };
  const soundMasculine = isPlural && form.type === 'sound_m';
  let baseArabic = soundMasculine ? noun.arabic : form.arabic;
  let baseLatin = soundMasculine ? noun.latin : form.latin;
  const taMarbuta = baseArabic.endsWith('ة');
  baseLatin = spokenStem(baseArabic, baseLatin);
  if (hasOwner || number === 'dual') baseArabic = attachedStem(baseArabic);
  const notes = [];
  const wordSegments = [];

  if (article) {
    const sun = SUN_LETTERS[baseArabic[0]];
    wordSegments.push(
      piece(
        'article',
        sun ? 'ال' : 'الْ',
        sun ? `a${sun}-` : 'al-',
        'The',
        'Makes this a particular thing.',
      ),
    );
    if (sun) {
      // Keep the combining shadda with its consonant; the Arabic stays joined.
      baseArabic = `${baseArabic[0]}ّ${baseArabic.slice(1)}`;
      notes.push(
        note(
          'The beginning joins the next sound',
          `“Al-” is still written ال. Before this letter its l-sound blends into ${sun}, so you hear “a${sun}-”.`,
        ),
      );
    }
  }
  wordSegments.push(
    piece(
      'stem',
      baseArabic,
      baseLatin,
      noun.label,
      number === 'singular' ? noun.english : noun.plural?.english || `${noun.english}s`,
    ),
  );
  let softOwner = false;

  if (number === 'dual') {
    if (owner.id === 'my') {
      wordSegments.push(
        piece(
          'owner',
          caseKey === 'u' ? 'َايَ' : 'َيَّ',
          caseKey === 'u' ? 'āya' : 'ayya',
          'Two + my',
          'The “two” and “my” sounds join together.',
        ),
      );
      notes.push(
        note(
          'Two and my join together',
          'The endings combine: baytāya for “my two houses” in the this-is position, and baytayya after in, from, to, or I saw.',
        ),
      );
    } else {
      const nominative = caseKey === 'u';
      wordSegments.push(
        piece(
          'number',
          nominative ? (hasOwner ? 'َا' : 'َانِ') : hasOwner ? 'َيْ' : 'َيْنِ',
          nominative ? (hasOwner ? 'ā' : 'āni') : hasOwner ? 'ay' : 'ayni',
          'Two',
          'Shows two, and changes to fit the sentence.',
        ),
      );
      softOwner = !nominative;
      notes.push(
        note(
          'Two has its own ending',
          'One becomes two with āni here, or ayni after in, from, to, or I saw. With an owner, the final n-sound drops: baytāni → baytānā.',
        ),
      );
    }
  } else if (soundMasculine) {
    if (owner.id === 'my') {
      wordSegments.push(
        piece(
          'owner',
          'ِيَّ',
          'iyya',
          'Plural + my',
          'The plural ending and “my” merge into one ending.',
        ),
      );
      notes.push(
        note(
          'My merges with this plural',
          'Muʿallimūna means teachers. With “my”, the sounds merge into muʿallimiyya. This combined ending is the same in all three positions.',
        ),
      );
    } else {
      const nominative = caseKey === 'u';
      wordSegments.push(
        piece(
          'number',
          nominative ? (hasOwner ? 'ُو' : 'ُونَ') : hasOwner ? 'ِي' : 'ِينَ',
          nominative ? (hasOwner ? 'ū' : 'ūna') : hasOwner ? 'ī' : 'īna',
          'More than two',
          'A human plural ending that also shows how the word fits.',
        ),
      );
      softOwner = !nominative;
      notes.push(
        note(
          'This plural uses ūna or īna',
          'This kind of people-word uses ūna here and īna after in, from, to, or I saw. With an owner, its final n-sound drops.',
        ),
      );
    }
  } else if (owner.id === 'my') {
    wordSegments.push(piece('owner', 'ِي', 'ī', 'My', 'Belonging or connected to me.'));
    notes.push(
      note(
        'My keeps the same sound',
        'With “my”, this word ends in ī in all three positions. The sentence still gives the word a job, but you do not add a separate u, a, or i before ī.',
      ),
    );
  } else {
    let visibleCase = caseKey;
    if (form.type === 'sound_f' && caseKey === 'a') visibleCase = 'i';
    if (form.diptote && !isDefinite && caseKey === 'i') visibleCase = 'a';
    const tanwin = !isDefinite && !form.diptote;
    let endingArabic = tanwin ? TANWIN[visibleCase] : VOWELS[visibleCase];
    // Accusative tanwin adds a written alif for these curated consonant-final forms.
    if (tanwin && visibleCase === 'a' && !taMarbuta) endingArabic += 'ا';
    wordSegments.push(
      piece(
        'case',
        endingArabic,
        `${visibleCase}${tanwin ? 'n' : ''}`,
        'How it fits',
        caseKey === 'u'
          ? 'The form used to point this out.'
          : caseKey === 'a'
            ? `Names ${context.objectDescription || 'the thing receiving the action'}.`
            : 'Follows in, from, or to.',
      ),
    );
    softOwner = visibleCase === 'i';
    if (form.type === 'sound_f' && caseKey === 'a')
      notes.push(
        note(
          'This plural keeps i after “I saw”',
          'Plurals ending in āt use i in both the I-saw position and after in, from, or to. The job changes even though this ending stays the same.',
        ),
      );
    if (form.diptote && !isDefinite)
      notes.push(
        note(
          'This plural has a special pattern',
          'This plural takes no final n-sound. Without “the” or an owner it uses a after in, from, or to. Adding “the” or an owner brings back i in that position.',
        ),
      );
    if (tanwin)
      notes.push(
        note(
          'Why an extra n-sound?',
          'This ordinary unspecified noun has a doubled vowel mark: un, an, or in. Adding “the” or an owner removes that n-sound. It is not the same as nā, “our”.',
        ),
      );
  }

  if (hasOwner && owner.id !== 'my') {
    const softened = softOwner && owner.softArabic;
    wordSegments.push(
      piece(
        'owner',
        softened ? owner.softArabic : owner.arabic,
        softened ? owner.softLatin : owner.latin,
        capitalise(owner.english),
        owner.description,
      ),
    );
    if (softened)
      notes.push(
        note(
          'The owner stays the same',
          `${owner.latin} becomes ${owner.softLatin} after an i-sound or a still y-sound. It still means “${owner.english}”. This is a sound change, not a new owner.`,
        ),
      );
  }

  if (taMarbuta && (hasOwner || number === 'dual'))
    notes.push(
      note(
        'The final ة opens into ت',
        'With an attached owner or a “two” ending, the final ة is written ت. The t belongs to the original word, not to the owner ending.',
      ),
    );
  if (hasOwner)
    notes.push(
      note(
        'Whose, or connected to whom?',
        'The ending can show ownership or a relationship: our house, my teacher, her day. An owner already identifies the noun, so it does not also take “the” or a final n-sound.',
      ),
    );
  if (number === 'plural' && !noun.human && context.familyId === 'pointing')
    notes.push(
      note(
        'Pointing to several things',
        context.id === 'that'
          ? 'For a group of nonhuman things farther away, Arabic normally uses tilka. The English still says “those”: tilka buyūtunā, “those are our houses”.'
          : 'Arabic normally uses hādhihi for a group of nonhuman things. The English still says “these”: hādhihi buyūtunā, “these are our houses”.',
      ),
    );
  if (isPlural && form.type === 'broken')
    notes.push(
      note(
        'The inside changed for the plural',
        'Some plurals change the inside of the word. This form is stored with the vocabulary; there is no single ending you can add to every noun.',
      ),
    );
  if (context.id === 'phrase')
    notes.push(
      note(
        'A word on its own',
        'This view uses the u-form for comparison. Choose a sentence beginning to see which form that sentence needs.',
      ),
    );
  else {
    const contextNote = note(
      'Why this ending?',
      caseKey === 'i'
        ? `“${context.label.replace('…', '')}” makes the next noun fit the in/from/to position. Regular singular nouns show i here.`
        : caseKey === 'a'
          ? `This names ${context.objectDescription || 'the thing receiving the action'}. Regular singular nouns show a in this position.`
          : 'You are pointing out what this is. Regular singular nouns show u in this position.',
    );
    if (owner.id === 'my' || number !== 'singular') notes.push(contextNote);
    else notes.unshift(contextNote);
  }
  if (noun.vocabularyNote) notes.push(note('About this word', noun.vocabularyNote));

  const segments = [...wordSegments];
  if (context.familyId === 'pointing') {
    const distant = context.id === 'that';
    const pointer = demonstrative(noun, number, distant);
    // The separating pronoun makes “This is the house” explicit, rather than “this house”.
    const prefixArabic = `${pointer.arabic}${article ? ` ${pointer.pronounArabic}` : ''} `;
    const prefixLatin = `${pointer.latin}${article ? ` ${pointer.pronounLatin}` : ''} `;
    segments.unshift(
      piece(
        'context',
        prefixArabic,
        prefixLatin,
        number === 'singular'
          ? distant
            ? 'That is'
            : 'This is'
          : distant
            ? 'Those are'
            : 'These are',
        'Points out the thing or things.',
      ),
    );
    if (article)
      notes.push(
        note(
          'Making “is” clear',
          distant
            ? 'With “the”, a small pronoun makes this a clear sentence: dhālika huwa al-baytu, “that is the house”. Dhālika al-baytu on its own can simply mean “that house”.'
            : 'With “the”, a small pronoun makes this a clear sentence: hādhā huwa al-baytu, “this is the house”. Hādhā al-baytu on its own can simply mean “this house”.',
        ),
      );
  } else if (context.arabic) {
    segments.unshift(
      piece(
        'context',
        `${context.arabic} `,
        `${context.latin} `,
        context.label.replace('…', ''),
        context.description,
      ),
    );
  }
  const englishParts = nounEnglish(noun, owner, context, number, article);
  return {
    arabic: join(segments, 'arabic'),
    latin: join(segments, 'latin'),
    wordArabic: join(wordSegments, 'arabic'),
    wordLatin: join(wordSegments, 'latin'),
    translation: englishParts.map((part) => part.text).join(''),
    englishParts,
    segments,
    notes,
    grammar: {
      nounId,
      ownerId,
      contextId,
      number,
      definiteness,
      caseKey,
      caseName: CASE_NAMES[caseKey],
      isDefinite,
      hasOwner,
      gender: noun.gender,
      root: noun.root,
      supported: true,
    },
  };
}

const PAST_ENDINGS = {
  i: ['ْتُ', 'tu'],
  we: ['ْنَا', 'nā'],
  you_m: ['ْتَ', 'ta'],
  you_f: ['ْتِ', 'ti'],
  you_two: ['ْتُمَا', 'tumā'],
  you_m_plural: ['ْتُمْ', 'tum'],
  you_f_plural: ['ْتُنَّ', 'tunna'],
  he: ['َ', 'a'],
  she: ['َتْ', 'at'],
  they_two_m: ['َا', 'ā'],
  they_two_f: ['َتَا', 'atā'],
  they_m: ['ُوا', 'ū'],
  they_f: ['ْنَ', 'na'],
};
const PRESENT_ENDINGS = {
  i: ['ُ', 'u'],
  we: ['ُ', 'u'],
  you_m: ['ُ', 'u'],
  you_f: ['ِينَ', 'īna'],
  you_two: ['َانِ', 'āni'],
  you_m_plural: ['ُونَ', 'ūna'],
  you_f_plural: ['ْنَ', 'na'],
  he: ['ُ', 'u'],
  she: ['ُ', 'u'],
  they_two_m: ['َانِ', 'āni'],
  they_two_f: ['َانِ', 'āni'],
  they_m: ['ُونَ', 'ūna'],
  they_f: ['ْنَ', 'na'],
};
function presentPrefix(personId) {
  if (personId === 'i') return ['أَ', 'a'];
  if (personId === 'we') return ['نَ', 'na'];
  if (personId.startsWith('you') || personId === 'she' || personId === 'they_two_f')
    return ['تَ', 'ta'];
  return ['يَ', 'ya'];
}

export function buildVerb({ verbId = 'kataba', personId = 'we', tenseId = 'past' } = {}) {
  const verb = find(VERBS, verbId, 'verb');
  const person = find(PERSONS, personId, 'person');
  const tense = find(TENSES, tenseId, 'tense');
  const past = tenseId === 'past' || tenseId === 'negative_past';
  const [first, second, third] = verb.letters;
  const [firstLatin, secondLatin, thirdLatin] = verb.latinLetters;
  const segments = [];
  const notes = [];
  if (tenseId === 'future')
    segments.push(piece('context', 'سَ', 'sa-', 'Will', 'Points to the future.'));
  if (tenseId === 'negative_present')
    segments.push(piece('context', 'لَا ', 'lā ', 'Does not', 'Says this action does not happen.'));
  if (tenseId === 'negative_past')
    segments.push(piece('context', 'مَا ', 'mā ', 'Did not', 'Says this action did not happen.'));
  if (!past) {
    const [arabic, latin] = presentPrefix(personId);
    segments.push(piece('prefix', arabic, latin, 'Who is doing it?', person.label));
  }
  const stemArabic = `${first}${past ? 'َ' : 'ْ'}${second}${VOWELS[past ? verb.pastVowel : verb.presentVowel]}${third}`;
  const stemLatin = `${firstLatin}${past ? 'a' : ''}${secondLatin}${past ? verb.pastVowel : verb.presentVowel}${thirdLatin}`;
  segments.push(
    piece(
      'stem',
      stemArabic,
      stemLatin,
      verb.label,
      `The action: ${verb.english}. Root letters: ${verb.root}.`,
    ),
  );
  const [endingArabic, endingLatin] = (past ? PAST_ENDINGS : PRESENT_ENDINGS)[personId];
  const simplePresentEnding = !past && endingLatin === 'u';
  segments.push(
    piece(
      simplePresentEnding ? 'case' : 'ending',
      endingArabic,
      endingLatin,
      past ? 'Who did it?' : simplePresentEnding ? 'Present ending' : 'Who / finishing sound',
      simplePresentEnding
        ? 'The ordinary present ending here. The prefix tells you who; this u does not mean “he”.'
        : person.label,
    ),
  );

  const englishParts = [{ id: past ? 'ending' : 'prefix', text: `${capitalise(person.english)} ` }];
  if (tenseId === 'future') englishParts.push({ id: 'context', text: 'will ' });
  if (tenseId === 'negative_present')
    englishParts.push({
      id: 'context',
      text: ['he', 'she'].includes(personId) ? 'does not ' : 'do not ',
    });
  if (tenseId === 'negative_past') englishParts.push({ id: 'context', text: 'did not ' });
  const action =
    tenseId === 'past'
      ? verb.pastEnglish
      : tenseId === 'present' && ['he', 'she'].includes(personId)
        ? verb.thirdEnglish
        : verb.english;
  englishParts.push({ id: 'stem', text: action });
  notes.push(
    note(
      past ? 'The ending tells you who' : 'The beginning and ending work together',
      past
        ? 'In these past forms, the ending helps show who did the action. Katabnā means “we wrote”; katabta means “you wrote”, speaking to a man.'
        : 'The beginning helps show who is doing it; some people also need a different ending. For example, yaktubu means “he writes”, and taktubīna addresses one woman.',
    ),
  );
  notes.push(
    note(
      'The middle sound belongs to this verb',
      `This verb is learned as a pair: ${verb.latin} and ${presentPrefix('he')[1]}${firstLatin}${secondLatin}${verb.presentVowel}${thirdLatin}u. You cannot predict every present middle vowel from the three root letters alone.`,
    ),
  );
  if (!past && ['you_m', 'she'].includes(personId))
    notes.push(
      note(
        'One shape can have two meanings',
        'Taktubu can mean “you write” when addressing one man, or “she writes”. A name, pronoun, or the conversation tells you which one is intended.',
      ),
    );
  if (tenseId === 'present')
    notes.push(
      note(
        'Now or usually',
        'This present form can mean a usual action or an action happening now. Context makes that clear.',
      ),
    );
  if (tenseId === 'future')
    notes.push(
      note(
        'Add a beginning for the future',
        'Sa- attaches directly to the present form. The rest still shows who is doing the action.',
      ),
    );
  if (tenseId === 'negative_past')
    notes.push(
      note(
        'A simple way to say “did not”',
        'Mā + the past form is one standard way to deny a past action. Another pattern uses lam and a changed present form; this builder keeps them separate.',
      ),
    );
  if (tenseId === 'negative_present')
    notes.push(
      note(
        'Saying no to an action',
        'Here lā denies a usual or present action. “Do not!” as a command uses a different pattern and is not what this setting means.',
      ),
    );
  if (past && personId === 'we')
    notes.push(
      note(
        'Nā does different jobs',
        'Here, after this past stem with a still final consonant, nā means “we did it”. On a noun, nā means “our”. Other verb constructions can use nā for “us”, so always look at the whole form.',
      ),
    );
  if (past && personId === 'they_m')
    notes.push(
      note(
        'A written letter you do not sound',
        'The alif after the plural wāw in كتبوا is written but not pronounced. You hear katabū.',
      ),
    );

  return {
    arabic: join(segments, 'arabic'),
    latin: join(segments, 'latin'),
    wordArabic: join(
      segments.filter((part) => part.id !== 'context'),
      'arabic',
    ),
    wordLatin: join(
      segments.filter((part) => part.id !== 'context'),
      'latin',
    ),
    translation: englishParts.map((part) => part.text).join(''),
    englishParts,
    segments,
    notes,
    grammar: {
      verbId,
      personId,
      tenseId,
      tense: tense.label,
      root: verb.root,
      past,
      supported: true,
    },
  };
}
