import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildNoun,
  buildVerb,
  getAvailableNumbers,
  NOUNS,
  VERBS,
} from '../src/features/arabic/grammar.mjs';
import { buildGlyphModel, HARAKAT } from '../src/features/arabic/arabicGlyphModel.mjs';
import {
  POINTING_WORDS,
  GUIDED_REFERENCE_TABLES,
  buildGuidedWord,
  explainGuidedWordPart,
  searchVocabulary,
  guidedGlyphResults,
} from '../src/features/arabic/guidedWordData.mjs';

test('the expanded checked inventory finds friends and Friday with ordinary learner spellings', () => {
  assert.equal(NOUNS.length, 80);
  assert.equal(VERBS.length, 14);
  assert.equal(new Set(NOUNS.map((entry) => entry.id)).size, NOUNS.length);
  assert.equal(new Set(VERBS.map((entry) => entry.id)).size, VERBS.length);
  for (const entry of [...NOUNS, ...VERBS]) assert.ok(Array.isArray(entry.aliases));
  assert.deepEqual(
    searchVocabulary(NOUNS, 'Fri').map((entry) => entry.id),
    ['sadiq', 'sadiqah', 'jumuah'],
  );
  assert.deepEqual(
    searchVocabulary(NOUNS, 'female friend').map((entry) => entry.id),
    ['sadiqah'],
  );
  assert.ok(searchVocabulary(NOUNS, 'sadiq').some((entry) => entry.id === 'sadiq'));
  assert.ok(searchVocabulary(NOUNS, 'صديق').some((entry) => entry.id === 'sadiq'));
  assert.deepEqual(
    searchVocabulary(NOUNS, 'jummah').map((entry) => entry.id),
    ['jumuah'],
  );
  assert.equal(searchVocabulary(NOUNS, '  ').length, 80);
  assert.equal(searchVocabulary(NOUNS, 'a word not in the list').length, 0);
  assert.equal(searchVocabulary(VERBS, 'understood')[0].id, 'fahima');
  assert.equal(buildNoun({ nounId: 'sadiq', ownerId: 'my' }).arabic, 'هَذَا صَدِيقِي');
  assert.equal(
    buildNoun({ nounId: 'jumuah', ownerId: 'none', contextId: 'phrase' }).arabic,
    'جُمُعَةٌ',
  );
});

test('recorded final-hamza stems preserve the correct owned forms without guessing a new spelling', () => {
  for (const [nounId, number, forms] of [
    ['sadiq', 'plural', ['أَصْدِقَاؤُنَا', 'أَصْدِقَاءَنَا', 'أَصْدِقَائِنَا', 'أَصْدِقَائِي']],
    ['tabib', 'plural', ['أَطِبَّاؤُنَا', 'أَطِبَّاءَنَا', 'أَطِبَّائِنَا', 'أَطِبَّائِي']],
    ['ma', 'singular', ['مَاؤُنَا', 'مَاءَنَا', 'مَائِنَا', 'مَائِي']],
  ]) {
    for (const [index, contextId] of ['this', 'saw', 'in'].entries())
      assert.equal(
        buildNoun({ nounId, number, contextId, ownerId: 'our' }).wordArabic,
        forms[index],
      );
    assert.equal(buildNoun({ nounId, number, ownerId: 'my' }).wordArabic, forms[3]);
  }
  assert.equal(
    buildNoun({ nounId: 'sadiq', number: 'plural', ownerId: 'none', contextId: 'in' }).wordArabic,
    'أَصْدِقَاءَ',
  );
  assert.equal(
    buildNoun({
      nounId: 'sadiq',
      number: 'plural',
      ownerId: 'none',
      contextId: 'in',
      definiteness: 'definite',
    }).wordArabic,
    'الْأَصْدِقَاءِ',
  );
});

test('mass entries do not invent servings, English articles, or an extra accusative alif for water', () => {
  for (const nounId of ['ma', 'halib', 'khubz', 'taam', 'qahwah']) {
    assert.deepEqual(
      getAvailableNumbers(nounId).map((option) => option.id),
      ['singular'],
    );
    assert.throws(() => buildNoun({ nounId, number: 'dual' }), RangeError);
    assert.throws(() => buildNoun({ nounId, number: 'plural' }), RangeError);
  }
  assert.equal(buildNoun({ nounId: 'halib', ownerId: 'none' }).translation, 'This is milk');
  assert.equal(buildNoun({ nounId: 'ma', ownerId: 'none' }).wordArabic, 'مَاءٌ');
  assert.equal(buildNoun({ nounId: 'ma', ownerId: 'none', contextId: 'saw' }).wordArabic, 'مَاءً');
  assert.equal(buildNoun({ nounId: 'ma', ownerId: 'none', contextId: 'in' }).wordArabic, 'مَاءٍ');
  assert.deepEqual(
    getAvailableNumbers('qaryah').map((option) => option.id),
    ['singular', 'dual'],
  );
});

test('new everyday verbs use independently specified past/present forms and middle vowels', () => {
  for (const [verbId, present, past] of [
    ['dhahaba', 'أَذْهَبُ', 'ذَهَبْتُ'],
    ['fahima', 'أَفْهَمُ', 'فَهِمْتُ'],
    ['hamala', 'أَحْمِلُ', 'حَمَلْتُ'],
    ['rakiba', 'أَرْكَبُ', 'رَكِبْتُ'],
    ['ghasala', 'أَغْسِلُ', 'غَسَلْتُ'],
    ['amila', 'أَعْمَلُ', 'عَمِلْتُ'],
  ]) {
    assert.equal(buildVerb({ verbId, personId: 'i', tenseId: 'present' }).arabic, present);
    assert.equal(buildVerb({ verbId, personId: 'i', tenseId: 'past' }).arabic, past);
  }
});

test('standalone pointing words mean this/that and every letter and mark belongs to a fixed spelling explanation', () => {
  for (const [id, arabic, latin, meaning] of [
    ['this_m', 'هَذَا', 'hādhā', 'This'],
    ['this_f', 'هَذِهِ', 'hādhihi', 'This'],
    ['that_m', 'ذَلِكَ', 'dhālika', 'That'],
    ['that_f', 'تِلْكَ', 'tilka', 'That'],
  ]) {
    const result = buildGuidedWord({ pointingId: id });
    assert.equal(result.arabic, arabic);
    assert.equal(result.latin, latin);
    assert.equal(result.translation, meaning);
    assert.equal(result.segments.map((part) => part.arabic).join(''), arabic);
    assert.equal(result.segments.map((part) => part.latin).join(''), latin);
    for (let index = 0; index < arabic.length; index += 1) {
      const note = explainGuidedWordPart(result, index);
      assert.ok(note?.body, `${id}:${index}`);
      assert.equal(note.fixed, true);
    }
    assert.equal(
      result.study.parts.reduce((length, part) => length + part.sourceEnd - part.sourceStart, 0),
      arabic.length,
    );
  }
  const feminine = buildGuidedWord({ pointingId: 'this_f' });
  const finalKasra = explainGuidedWordPart(feminine, feminine.arabic.length - 1);
  assert.match(finalKasra.body, /fixed pointing word/u);
  assert.match(finalKasra.body, /not a changing noun-case ending/u);
  assert.match(explainGuidedWordPart(buildGuidedWord(), 1).body, /omits a full alif/u);
  assert.equal(POINTING_WORDS.find((entry) => entry.id === 'that_f').distance, 'far');
});

test('nā uses n plus fatḥa/alif and its noun-owner meaning stays distinct from past-verb we', () => {
  for (const [selection, intended] of [
    [{ type: 'noun', ownerId: 'our' }, 'our'],
    [{ type: 'verb', personId: 'we', tenseId: 'past' }, 'we'],
  ]) {
    const result = buildGuidedWord(selection);
    const vowel = result.arabic.lastIndexOf('َا');
    for (const sourceIndex of [vowel, vowel + 1]) {
      const detail = explainGuidedWordPart(result, { sourceIndex });
      assert.equal(detail.kind, 'long-vowel');
      assert.equal(detail.title, 'Fatḥa + alif → long ā');
      assert.deepEqual(detail.sourceIndices, [vowel, vowel + 1]);
      assert.match(detail.body, new RegExp(`whole nā ending means ${intended}`));
    }
  }
});

test('baytī keeps my intact and kitābuka explains the selected word’s case without changing the owner', () => {
  const my = buildGuidedWord({ type: 'noun', ownerId: 'my' });
  assert.equal(my.arabic, 'بَيْتِي');
  assert.deepEqual(
    my.segments.map((part) => part.id),
    ['stem', 'owner'],
  );
  assert.equal(explainGuidedWordPart(my, my.arabic.length - 1).title, 'Kasra + yāʾ → long ī');
  const book = buildGuidedWord({ type: 'noun', nounId: 'kitab', ownerId: 'your_m' });
  assert.equal(book.arabic, 'كِتَابُكَ');
  assert.equal(book.latin, 'kitābuka');
  const ending = book.study.parts.find((part) => part.id === 'case');
  const detail = explainGuidedWordPart(book, ending.sourceStart);
  assert.equal(detail.kind, 'case');
  assert.match(detail.body, /kitābuka/u);
  assert.match(detail.body, /kitābika/u);
  assert.match(detail.body, /kitābaka/u);
  assert.equal(detail.examples[1].arabic, 'فِي كِتَابِكَ');
  const house = buildGuidedWord({ type: 'noun', ownerId: 'our' });
  const houseNote = explainGuidedWordPart(house, 'case');
  assert.match(houseNote.body, /baytunā/u);
  assert.doesNotMatch(houseNote.body, /kitāb/u);
});

test('small reference tables use complete examples and point to real sounds in those words', () => {
  assert.deepEqual(
    GUIDED_REFERENCE_TABLES.map((table) => table.id),
    ['sounds', 'owners', 'pointing', 'verbs'],
  );
  for (const table of GUIDED_REFERENCE_TABLES)
    for (const row of table.rows) assert.equal(row.length, table.columns.length);
  const sounds = GUIDED_REFERENCE_TABLES.find((table) => table.id === 'sounds');
  for (const row of sounds.rows) {
    const cell = row[2];
    assert.ok(HARAKAT[cell.result.arabic[cell.sourceIndex]], row[0]);
    assert.equal(cell.result.segments.map((part) => part.arabic).join(''), cell.result.arabic);
  }
  const shadda = sounds.rows.find((row) => row[0].includes('shadda'))[2];
  assert.equal(shadda.result.arabic[shadda.sourceIndex], 'ّ');
  assert.equal(shadda.result.arabic, 'مُعَلِّمِي');
  const verbs = GUIDED_REFERENCE_TABLES.find((table) => table.id === 'verbs');
  assert.equal(verbs.rows[0][1].result.arabic, 'أَكْتُبُ');
  assert.equal(verbs.rows[0][2].result.arabic, 'كَتَبْتُ');
  assert.equal(verbs.rows[1][1].result.arabic, 'نَكْتُبُ');
  assert.equal(verbs.rows[1][2].result.arabic, 'كَتَبْنَا');
});

test('every canonical guide and table example has exact pre-shaped glyph coverage', () => {
  const atlas = JSON.parse(
    readFileSync(new URL('../src/features/arabic/glyphs/atlas.json', import.meta.url), 'utf8'),
  );
  for (const result of guidedGlyphResults()) {
    const model = buildGlyphModel(result, atlas);
    assert.equal(model.mode, 'shaped', result.arabic);
    assert.equal(model.text, result.arabic);
  }
});
