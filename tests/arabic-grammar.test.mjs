import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNoun,
  buildVerb,
  getAvailableNumbers,
  NOUNS,
  OWNERS,
  CONTEXTS,
  DEFINITENESS,
  VERBS,
  PERSONS,
  TENSES,
} from '../src/features/arabic/grammar.mjs';

test('the original learner examples keep the base, case vowel, and owner separate', () => {
  const first = buildNoun();
  assert.equal(first.arabic, 'هَذَا بَيْتُنَا');
  assert.equal(first.latin, 'hādhā baytunā');
  assert.equal(first.translation, 'This is our house');
  assert.deepEqual(
    first.segments.filter((part) => part.id !== 'context').map(({ id, latin }) => [id, latin]),
    [
      ['stem', 'bayt'],
      ['case', 'u'],
      ['owner', 'nā'],
    ],
  );
  assert.equal(buildNoun({ contextId: 'in' }).arabic, 'فِي بَيْتِنَا');
  assert.equal(buildNoun({ contextId: 'saw' }).arabic, 'رَأَيْتُ بَيْتَنَا');
  assert.equal(buildNoun({ contextId: 'in' }).translation, 'In our house');
});

test('his changes hu to hi, while her remains hā', () => {
  const examples = [
    ['his', 'this', 'بَيْتُهُ', 'baytuhu'],
    ['his', 'saw', 'بَيْتَهُ', 'baytahu'],
    ['his', 'in', 'بَيْتِهِ', 'baytihi'],
    ['her', 'this', 'بَيْتُهَا', 'baytuhā'],
    ['her', 'in', 'بَيْتِهَا', 'baytihā'],
    ['their_m', 'in', 'بَيْتِهِمْ', 'baytihim'],
    ['their_f', 'in', 'بَيْتِهِنَّ', 'baytihinna'],
    ['their_two', 'in', 'بَيْتِهِمَا', 'baytihimā'],
  ];
  for (const [ownerId, contextId, arabic, latin] of examples) {
    const result = buildNoun({ ownerId, contextId });
    assert.equal(result.wordArabic, arabic);
    assert.equal(result.wordLatin, latin);
  }
});

test('the suffix ī stays the same in all sentence jobs without a separate case sound', () => {
  for (const contextId of ['this', 'in', 'from', 'to', 'saw']) {
    const result = buildNoun({ ownerId: 'my', contextId });
    assert.equal(result.wordArabic, 'بَيْتِي');
    assert.equal(result.wordLatin, 'baytī');
    assert.equal(
      result.segments.some((part) => part.id === 'case'),
      false,
    );
  }
  assert.equal(buildNoun({ ownerId: 'my', contextId: 'in' }).grammar.caseKey, 'i');
});

test('a possessive cannot also add al- or tanwin; feminine ة opens before an owner', () => {
  const definiteOwner = buildNoun({ definiteness: 'definite', ownerId: 'our' });
  assert.equal(definiteOwner.wordArabic, 'بَيْتُنَا');
  assert.equal(
    definiteOwner.segments.some((part) => part.id === 'article'),
    false,
  );
  assert.equal(definiteOwner.translation, 'This is our house');
  assert.equal(buildNoun({ nounId: 'madrasah', ownerId: 'my' }).wordArabic, 'مَدْرَسَتِي');
  assert.equal(
    buildNoun({ nounId: 'madrasah', ownerId: 'her', contextId: 'in' }).wordLatin,
    'madrasatihā',
  );
  assert.equal(
    buildNoun({ nounId: 'madrasah', ownerId: 'none', contextId: 'saw' }).wordArabic,
    'مَدْرَسَةً',
  );
  assert.equal(
    buildNoun({ nounId: 'kitab', ownerId: 'none', contextId: 'saw' }).wordArabic,
    'كِتَابًا',
  );
});

test('dual endings change by sentence position and lose n before an owner', () => {
  const examples = [
    ['none', 'this', 'بَيْتَانِ', 'baytāni'],
    ['none', 'in', 'بَيْتَيْنِ', 'baytayni'],
    ['his', 'this', 'بَيْتَاهُ', 'baytāhu'],
    ['his', 'in', 'بَيْتَيْهِ', 'baytayhi'],
    ['our', 'saw', 'بَيْتَيْنَا', 'baytaynā'],
    ['my', 'this', 'بَيْتَايَ', 'baytāya'],
    ['my', 'in', 'بَيْتَيَّ', 'baytayya'],
  ];
  for (const [ownerId, contextId, arabic, latin] of examples) {
    const result = buildNoun({ number: 'dual', ownerId, contextId });
    assert.equal(result.wordArabic, arabic);
    assert.equal(result.wordLatin, latin);
  }
  assert.equal(
    buildNoun({ nounId: 'madrasah', number: 'dual', ownerId: 'none' }).arabic,
    'هَاتَانِ مَدْرَسَتَانِ',
  );
});

test('plural rules are lexical, including diptotes, sound-f case, and sound-m owner endings', () => {
  assert.equal(buildNoun({ number: 'plural' }).arabic, 'هَذِهِ بُيُوتُنَا');
  assert.equal(
    buildNoun({ nounId: 'masjid', number: 'plural', ownerId: 'none', contextId: 'in' }).wordArabic,
    'مَسَاجِدَ',
  );
  assert.equal(
    buildNoun({
      nounId: 'masjid',
      number: 'plural',
      ownerId: 'none',
      definiteness: 'definite',
      contextId: 'in',
    }).wordArabic,
    'الْمَسَاجِدِ',
  );
  assert.equal(
    buildNoun({ nounId: 'masjid', number: 'plural', ownerId: 'our', contextId: 'in' }).wordArabic,
    'مَسَاجِدِنَا',
  );
  const cars = buildNoun({
    nounId: 'sayyarah',
    number: 'plural',
    ownerId: 'his',
    contextId: 'saw',
  });
  assert.equal(cars.wordArabic, 'سَيَّارَاتِهِ');
  assert.equal(cars.grammar.caseKey, 'a');
  assert.equal(
    buildNoun({ nounId: 'muallim', number: 'plural', ownerId: 'none' }).wordArabic,
    'مُعَلِّمُونَ',
  );
  assert.equal(
    buildNoun({ nounId: 'muallim', number: 'plural', ownerId: 'his', contextId: 'in' }).wordArabic,
    'مُعَلِّمِيهِ',
  );
  assert.equal(
    buildNoun({ nounId: 'muallim', number: 'plural', ownerId: 'my' }).wordArabic,
    'مُعَلِّمِيَّ',
  );
  assert.equal(
    buildNoun({ nounId: 'muallim', number: 'plural', ownerId: 'my' }).wordLatin,
    'muʿallimiyya',
  );
});

test('pointing words match number and gender, and definite predicates clearly include is', () => {
  assert.equal(
    buildNoun({ ownerId: 'none', definiteness: 'definite' }).arabic,
    'هَذَا هُوَ الْبَيْتُ',
  );
  assert.equal(
    buildNoun({ nounId: 'madrasah', ownerId: 'none', definiteness: 'definite' }).arabic,
    'هَذِهِ هِيَ الْمَدْرَسَةُ',
  );
  assert.equal(
    buildNoun({ number: 'dual', ownerId: 'none', definiteness: 'definite' }).arabic,
    'هَذَانِ هُمَا الْبَيْتَانِ',
  );
  assert.equal(
    buildNoun({ nounId: 'muallimah', number: 'plural', ownerId: 'none', definiteness: 'definite' })
      .arabic,
    'هَؤُلَاءِ هُنَّ الْمُعَلِّمَاتُ',
  );
  assert.equal(
    buildNoun({ nounId: 'shajarah', ownerId: 'none', definiteness: 'definite' }).wordLatin,
    'ash-shajaratu',
  );
});

test('far pointing forms match feminine, dual, human plural and nonhuman plural nouns', () => {
  const examples = [
    [{ ownerId: 'my' }, 'ذَلِكَ بَيْتِي', 'dhālika baytī', 'That is my house'],
    [
      { nounId: 'madrasah', ownerId: 'my' },
      'تِلْكَ مَدْرَسَتِي',
      'tilka madrasatī',
      'That is my school',
    ],
    [
      { number: 'dual', ownerId: 'our' },
      'ذَانِكَ بَيْتَانَا',
      'dhānika baytānā',
      'Those are our two houses',
    ],
    [
      { nounId: 'madrasah', number: 'dual', ownerId: 'our' },
      'تَانِكَ مَدْرَسَتَانَا',
      'tānika madrasatānā',
      'Those are our two schools',
    ],
    [
      { number: 'plural', ownerId: 'our' },
      'تِلْكَ بُيُوتُنَا',
      'tilka buyūtunā',
      'Those are our houses',
    ],
    [
      { nounId: 'walad', number: 'plural', ownerId: 'our' },
      'أُولَئِكَ أَوْلَادُنَا',
      'ulāʾika awlādunā',
      'Those are our boys',
    ],
  ];
  for (const [options, arabic, latin, translation] of examples) {
    const result = buildNoun({ ...options, contextId: 'that' });
    assert.equal(result.arabic, arabic);
    assert.equal(result.latin, latin);
    assert.equal(result.translation, translation);
    assert.equal(result.grammar.caseKey, 'u');
  }
  assert.equal(
    buildNoun({ contextId: 'that', ownerId: 'none', definiteness: 'definite' }).arabic,
    'ذَلِكَ هُوَ الْبَيْتُ',
  );
  assert.equal(
    buildNoun({
      nounId: 'muallimah',
      number: 'plural',
      contextId: 'that',
      ownerId: 'none',
      definiteness: 'definite',
    }).arabic,
    'أُولَئِكَ هُنَّ الْمُعَلِّمَاتُ',
  );
});

test('checked first-person action phrases give their following noun the action role', () => {
  const opened = buildNoun({ nounId: 'bab', ownerId: 'our', contextId: 'opened' });
  assert.equal(opened.arabic, 'فَتَحْتُ بَابَنَا');
  assert.equal(opened.latin, 'fataḥtu bābanā');
  assert.equal(opened.translation, 'I opened our door');
  assert.equal(opened.grammar.caseKey, 'a');
  const entered = buildNoun({ ownerId: 'his', contextId: 'entered' });
  assert.equal(entered.arabic, 'دَخَلْتُ بَيْتَهُ');
  assert.equal(entered.latin, 'dakhaltu baytahu');
  assert.equal(entered.translation, 'I entered his house');
  assert.match(entered.notes[0].body, /place I entered/u);
  assert.equal(buildNoun({ ownerId: 'my', contextId: 'entered' }).wordArabic, 'بَيْتِي');
  assert.equal(
    buildNoun({ nounId: 'bab', ownerId: 'my', contextId: 'opened' }).wordArabic,
    'بَابِي',
  );
  // This remains a fixed first-person context, not an invented general weak-verb conjugator.
  assert.equal(opened.segments[0].id, 'context');
  assert.equal(entered.segments[0].id, 'context');
});

test('unvetted forms are unavailable instead of invented', () => {
  assert.deepEqual(
    getAvailableNumbers('laylah').map((option) => option.id),
    ['singular', 'dual'],
  );
  assert.throws(() => buildNoun({ nounId: 'laylah', number: 'plural' }), RangeError);
  assert.throws(() => buildNoun({ nounId: 'not-a-word' }), RangeError);
  assert.throws(() => buildNoun({ ownerId: 'nonsense' }), RangeError);
  assert.throws(() => buildVerb({ tenseId: 'unknown' }), RangeError);
});

test('all supported noun choices preserve exact Arabic, Latin and English segment assembly', () => {
  let cases = 0;
  for (const noun of NOUNS)
    for (const owner of OWNERS)
      for (const context of CONTEXTS) {
        for (const number of getAvailableNumbers(noun.id))
          for (const definite of DEFINITENESS) {
            const result = buildNoun({
              nounId: noun.id,
              ownerId: owner.id,
              contextId: context.id,
              number: number.id,
              definiteness: definite.id,
            });
            assert.equal(result.segments.map((part) => part.arabic).join(''), result.arabic);
            assert.equal(result.segments.map((part) => part.latin).join(''), result.latin);
            assert.equal(result.englishParts.map((part) => part.text).join(''), result.translation);
            assert.doesNotMatch(result.arabic, /undefined|[a-zA-Z]/);
            if (owner.id !== 'none')
              assert.equal(
                result.segments.some((part) => part.id === 'article'),
                false,
              );
            cases += 1;
          }
      }
  assert.ok(cases > 10_000);
});

test('all kataba past and present person forms match independently specified examples', () => {
  const forms = {
    i: ['كَتَبْتُ', 'أَكْتُبُ'],
    we: ['كَتَبْنَا', 'نَكْتُبُ'],
    you_m: ['كَتَبْتَ', 'تَكْتُبُ'],
    you_f: ['كَتَبْتِ', 'تَكْتُبِينَ'],
    you_two: ['كَتَبْتُمَا', 'تَكْتُبَانِ'],
    you_m_plural: ['كَتَبْتُمْ', 'تَكْتُبُونَ'],
    you_f_plural: ['كَتَبْتُنَّ', 'تَكْتُبْنَ'],
    he: ['كَتَبَ', 'يَكْتُبُ'],
    she: ['كَتَبَتْ', 'تَكْتُبُ'],
    they_two_m: ['كَتَبَا', 'يَكْتُبَانِ'],
    they_two_f: ['كَتَبَتَا', 'تَكْتُبَانِ'],
    they_m: ['كَتَبُوا', 'يَكْتُبُونَ'],
    they_f: ['كَتَبْنَ', 'يَكْتُبْنَ'],
  };
  for (const [personId, [past, present]] of Object.entries(forms)) {
    assert.equal(buildVerb({ personId, tenseId: 'past' }).arabic, past);
    assert.equal(buildVerb({ personId, tenseId: 'present' }).arabic, present);
  }
  assert.equal(buildVerb({ personId: 'they_m' }).latin, 'katabū');
  assert.equal(buildVerb({ personId: 'she', tenseId: 'present' }).segments.at(-1).id, 'case');
});

test('different Form I middle vowels are recorded rather than guessed', () => {
  for (const [verbId, past, present] of [
    ['samia', 'سَمِعَ', 'يَسْمَعُ'],
    ['shariba', 'شَرِبَ', 'يَشْرَبُ'],
    ['jalasa', 'جَلَسَ', 'يَجْلِسُ'],
    ['darasa', 'دَرَسَ', 'يَدْرُسُ'],
    ['fataha', 'فَتَحَ', 'يَفْتَحُ'],
    ['dakhala', 'دَخَلَ', 'يَدْخُلُ'],
    ['kharaja', 'خَرَجَ', 'يَخْرُجُ'],
  ]) {
    assert.equal(buildVerb({ verbId, personId: 'he' }).arabic, past);
    assert.equal(buildVerb({ verbId, personId: 'he', tenseId: 'present' }).arabic, present);
  }
});

test('negation and future use matching Arabic and English constructions', () => {
  assert.equal(buildVerb({ personId: 'he', tenseId: 'future' }).arabic, 'سَيَكْتُبُ');
  assert.equal(buildVerb({ personId: 'he', tenseId: 'future' }).translation, 'He will write');
  assert.equal(buildVerb({ personId: 'she', tenseId: 'negative_present' }).arabic, 'لَا تَكْتُبُ');
  assert.equal(
    buildVerb({ personId: 'she', tenseId: 'negative_present' }).translation,
    'She does not write',
  );
  assert.equal(buildVerb({ personId: 'we', tenseId: 'negative_past' }).arabic, 'مَا كَتَبْنَا');
  assert.equal(
    buildVerb({ personId: 'we', tenseId: 'negative_past' }).translation,
    'We did not write',
  );
  assert.equal(buildVerb({ verbId: 'kharaja', personId: 'he' }).translation, 'He went out');
});

test('every supported verb choice preserves presentation invariants', () => {
  for (const verb of VERBS)
    for (const person of PERSONS)
      for (const tense of TENSES) {
        const result = buildVerb({ verbId: verb.id, personId: person.id, tenseId: tense.id });
        assert.equal(result.segments.map((part) => part.arabic).join(''), result.arabic);
        assert.equal(result.segments.map((part) => part.latin).join(''), result.latin);
        assert.equal(result.englishParts.map((part) => part.text).join(''), result.translation);
        assert.doesNotMatch(result.arabic, /undefined|[a-zA-Z]/);
        assert.ok(result.notes[0].body.length > 20);
      }
});
