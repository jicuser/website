import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGlyphModel, HARAKAT } from '../src/features/arabic/arabicGlyphModel.mjs';
import {
  buildNoun,
  buildVerb,
  NOUNS,
  OWNERS,
  CONTEXTS,
  DEFINITENESS,
  VERBS,
  PERSONS,
  TENSES,
  getAvailableNumbers,
} from '../src/features/arabic/grammar.mjs';
import {
  buildSentence,
  INITIAL_SENTENCE,
  SENTENCE_TEMPLATES,
} from '../src/features/arabic/sentences.mjs';
import { GRAMMAR_TOPICS, PRACTICE_QUESTIONS } from '../src/features/arabic/learningContent.mjs';

const atlas = JSON.parse(
  readFileSync(new URL('../src/features/arabic/glyphs/atlas.json', import.meta.url)),
);
const items = (model) =>
  model.tokens.filter((token) => token.type === 'run').flatMap((token) => token.items);
const groups = (model) => items(model).flatMap((item) => item.groups || []);
const modelFor = (result) => buildGlyphModel(result, atlas);
const tokenise = (text) => text.match(/[\p{L}\p{M}\p{N}]+|[^\s\p{L}\p{M}\p{N}]/gu) || [];

// This is the original visible bug: a combining vowel inherited the blue of ت.
// It must now be its own gold path, with the case segment's callback identity.
test('baytunā paints the real ḍamma separately without changing the Arabic', () => {
  const result = buildNoun({ ownerId: 'our', contextId: 'phrase' });
  const model = modelFor(result);
  assert.equal(model.text, 'بَيْتُنَا');
  assert.equal(model.mode, 'shaped');
  assert.equal(model.tokens.map((token) => token.text).join(''), result.arabic);
  const damma = groups(model).find((group) => group.character === 'ُ');
  assert.equal(damma.partId, 'case');
  assert.equal(damma.colour, 'damma');
  assert.equal(damma.mark.id, 'damma');
  assert.equal(damma.sourceIndex, result.arabic.indexOf('ُ'));
  assert.ok(damma.paths.every((path) => path.d.length > 0));
  const ta = groups(model).find((group) => group.character === 'ت');
  assert.equal(ta.partId, 'stem');
  assert.equal(ta.colour, 'stem');
  assert.equal(ta.mark, null);
  // Noto splits the letter's dots into a separate outline. They are still ت,
  // not a diacritic or a separate coloured word ending.
  assert.ok(ta.paths.length > 1);
  assert.equal(groups(model).find((group) => group.character === 'ن').colour, 'owner');
  assert.ok(!/[\u200c\u200d]/u.test(model.text));
});

test('fī baytihi preserves the independent case and owner kasras', () => {
  const result = buildNoun({ ownerId: 'his', contextId: 'in' });
  const kasras = groups(modelFor(result)).filter((group) => group.character === 'ِ');
  assert.deepEqual(
    kasras.map((group) => group.partId),
    ['context', 'owner', 'case'],
  );
  assert.ok(kasras.every((group) => group.colour === 'kasra' && group.hitBox[2] >= 300));
  assert.equal(groups(modelFor(result)).find((group) => group.character === 'ه').colour, 'owner');
});

test('combined shadda + kasra outlines keep both original marks independently selectable', () => {
  const result = buildNoun({
    nounId: 'muallimah',
    ownerId: 'none',
    definiteness: 'definite',
    number: 'plural',
    contextId: 'phrase',
  });
  const model = modelFor(result);
  assert.match(result.arabic, /لِّ/u);
  const shadda = groups(model).find((group) => group.character === 'ّ');
  const kasra = groups(model).find((group) => group.sourceIndex === shadda.sourceIndex + 1);
  assert.equal(shadda.colour, 'shadda');
  assert.equal(kasra.character, 'ِ');
  assert.equal(kasra.colour, 'kasra');
  assert.notEqual(shadda.paths[0].d, kasra.paths[0].d);
  // These are parts of the SAME positioned combined mark: splitting did not
  // guess a browser offset or move either of the two existing contours.
  assert.equal(shadda.paths[0].x, kasra.paths[0].x);
  assert.equal(shadda.paths[0].y, kasra.paths[0].y);
});

test('letter hamza and dots stay with their letter while vowels keep mark colours', () => {
  const result = buildNoun({ contextId: 'to', ownerId: 'our' });
  const hamzaLetter = groups(modelFor(result)).find((group) => group.character === 'إ');
  assert.equal(hamzaLetter.colour, 'context');
  assert.equal(hamzaLetter.mark, null);
  assert.ok(hamzaLetter.paths.length > 1);
  for (const group of groups(modelFor(result))) {
    assert.equal(Boolean(group.mark), Boolean(HARAKAT[group.character]));
  }
});

test('lam–alif remains pre-shaped as a joined word with an independent fatḥa', () => {
  const result = buildVerb({ tenseId: 'negative_present' });
  const la = items(modelFor(result)).find((item) => item.text === 'لَا');
  assert.ok(la);
  assert.equal(la.width, 518);
  assert.deepEqual(new Set(la.groups.map((group) => group.character)), new Set(['ل', 'َ', 'ا']));
  assert.equal(la.groups.find((group) => group.character === 'َ').colour, 'fatha');
});

test('sentence scopes and attached punctuation survive the visual model', () => {
  const result = buildSentence({ ...INITIAL_SENTENCE, question: true });
  const model = modelFor(result);
  assert.equal(model.mode, 'shaped');
  assert.equal(model.tokens.map((token) => token.text).join(''), result.arabic);
  assert.ok(groups(model).some((group) => group.partId === 'place:case'));
  assert.ok(groups(model).some((group) => group.partId === 'subject:owner'));
  const lastRun = model.tokens.at(-1);
  assert.ok(lastRun.text.endsWith('؟'));
  assert.equal(lastRun.items.at(-1).text, '؟');
  assert.equal(lastRun.items.at(-1).groups[0].partId, 'punctuation');
});

test('unknown words and mismatched segment text fall back to exact readable source', () => {
  const source = 'فِي  مُسْتَشْفًى؟';
  const model = modelFor({ arabic: source });
  assert.equal(model.mode, 'mixed');
  assert.equal(model.tokens.map((token) => token.text).join(''), source);
  assert.equal(items(model).find((item) => item.type === 'fallback').text, 'مُسْتَشْفًى');
  const mismatched = modelFor({ arabic: source, segments: [{ id: 'stem', arabic: 'مختلف' }] });
  assert.equal(mismatched.mode, 'plain');
  assert.equal(mismatched.text, source);
  assert.equal(mismatched.fallbackReason, 'segment-mismatch');
});

test('all current noun, verb, sentence and teaching-example tokens have a checked outline', () => {
  const required = new Set();
  const add = (result) => tokenise(result.arabic).forEach((word) => required.add(word));
  for (const noun of NOUNS)
    for (const owner of OWNERS)
      for (const context of CONTEXTS)
        for (const number of getAvailableNumbers(noun.id))
          for (const definite of DEFINITENESS)
            add(
              buildNoun({
                nounId: noun.id,
                ownerId: owner.id,
                contextId: context.id,
                number: number.id,
                definiteness: definite.id,
              }),
            );
  for (const verb of VERBS)
    for (const person of PERSONS)
      for (const tense of TENSES)
        add(buildVerb({ verbId: verb.id, personId: person.id, tenseId: tense.id }));
  for (const template of SENTENCE_TEMPLATES)
    add(buildSentence({ ...INITIAL_SENTENCE, template: template.id, question: true }));
  for (const topic of GRAMMAR_TOPICS)
    for (const example of topic.examples) add({ arabic: example.ar });
  for (const question of PRACTICE_QUESTIONS) {
    if (question.promptArabic) add({ arabic: question.promptArabic });
    for (const option of question.options) if (option.ar) add({ arabic: option.ar });
  }
  for (const word of required)
    assert.ok(
      atlas.words[word] || atlas.nativeTextTokens.includes(word),
      `Regenerate the glyph atlas for: ${word}`,
    );
  assert.ok(required.size > 2900);
});

test('every vowel in the atlas has its own correctly sourced coloured outline', () => {
  for (const word of Object.keys(atlas.words)) {
    const model = modelFor({ arabic: word });
    const bySource = new Map(groups(model).map((group) => [group.sourceIndex, group]));
    for (let index = 0; index < word.length; index += 1) {
      if (!HARAKAT[word[index]]) continue;
      const group = bySource.get(index);
      assert.ok(group, `Missing mark ${word[index]} at ${index} in ${word}`);
      assert.equal(group.mark.id, HARAKAT[word[index]].id);
      assert.ok(group.paths.length > 0);
    }
  }
});

test('the distributed font-derived atlas retains its original license', () => {
  assert.match(atlas.font.license, /SIL OPEN FONT LICENSE Version 1\.1/u);
  assert.match(atlas.font.license, /Copyright 2022 The Noto Project Authors/u);
});
