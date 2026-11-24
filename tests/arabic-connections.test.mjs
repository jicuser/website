import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNoun, buildVerb } from '../src/features/arabic/grammar.mjs';
import { buildSentence, INITIAL_SENTENCE } from '../src/features/arabic/sentences.mjs';
import {
  meaningConnections,
  selectedMeaningConnection,
  unmatchedArabicParts,
  resolveMarkFocus,
  segmentRanges,
  compareArabicResults,
  connectionGeometry,
} from '../src/features/arabic/arabicConnectionModel.mjs';

const byMeaning = (parts, id) => parts.find((part) => part.id === id);

test('our house links the three meanings and keeps the case sound separate', () => {
  const result = buildNoun();
  const links = meaningConnections(result);
  assert.equal(links.map((part) => part.text).join(''), result.translation);
  assert.deepEqual(byMeaning(links, 'owner').targetIds, ['owner']);
  assert.deepEqual(byMeaning(links, 'stem').targetIds, ['stem']);
  assert.deepEqual(byMeaning(links, 'context').targetIds, ['context']);
  assert.deepEqual(
    unmatchedArabicParts(result, links).map((part) => part.id),
    ['case'],
  );
});

test('a/an/some cannot acquire a false Arabic article or case-vowel connection', () => {
  for (const nounId of ['bayt', 'ayah']) {
    const result = buildNoun({ nounId, ownerId: 'none' });
    const article = byMeaning(meaningConnections(result, { article: 'case' }), 'article');
    assert.deepEqual(article.targetIds, []);
    assert.equal(article.actionId, null);
  }
  const plural = buildNoun({ ownerId: 'none', number: 'plural' });
  assert.deepEqual(byMeaning(meaningConnections(plural), 'article').targetIds, []);
  const definite = buildNoun({ ownerId: 'none', definiteness: 'definite' });
  assert.deepEqual(byMeaning(meaningConnections(definite), 'article').targetIds, ['article']);
});

test('present person can connect to prefix and ending, never to ordinary final u', () => {
  const feminine = meaningConnections(buildVerb({ tenseId: 'present', personId: 'you_f' }));
  assert.deepEqual(byMeaning(feminine, 'prefix').targetIds, ['prefix', 'ending']);
  const he = meaningConnections(buildVerb({ tenseId: 'present', personId: 'he' }));
  assert.deepEqual(byMeaning(he, 'prefix').targetIds, ['prefix']);
  const past = meaningConnections(buildVerb({ tenseId: 'past', personId: 'we' }));
  assert.deepEqual(byMeaning(past, 'ending').targetIds, ['ending']);
});

test('null suppresses a connection and linking is never borrows the place preposition', () => {
  const result = buildSentence(INITIAL_SENTENCE);
  const links = meaningConnections(result, { context: null, 'place:context': null });
  assert.ok(links.filter((part) => part.id === 'context').every((part) => !part.actionId));
  assert.deepEqual(byMeaning(links, 'place:context').targetIds, []);
  assert.deepEqual(byMeaning(links, 'place:owner').targetIds, ['place:owner']);
  assert.deepEqual(byMeaning(links, 'subject:stem').targetIds, ['subject:stem']);
  assert.equal(links.map((part) => part.text).join(''), result.translation);
});

test('two and my can share their true combined ending while retaining English identity', () => {
  const result = buildNoun({ ownerId: 'my', number: 'dual' });
  const links = meaningConnections(result, { number: 'owner' });
  const two = byMeaning(links, 'number');
  assert.equal(two.id, 'number');
  assert.equal(two.text, 'two ');
  assert.equal(two.actionId, 'owner');
  assert.deepEqual(two.targetIds, ['owner']);
  assert.deepEqual(byMeaning(links, 'owner').targetIds, ['owner']);
});

test('changing the edit meaning overrides a remembered chip on the same fused ending', () => {
  const result = buildNoun({ ownerId: 'my', number: 'dual' });
  const links = meaningConnections(result, { number: 'owner' });
  const two = byMeaning(links, 'number');
  const selectingTwo = selectedMeaningConnection(links, {
    selectedPart: 'owner',
    selectedMeaningId: 'number',
  });
  assert.equal(selectingTwo.id, 'number');
  const selectingMy = selectedMeaningConnection(links, {
    selectedPart: 'owner',
    selectedMeaningId: 'owner',
    rememberedKey: two.key,
  });
  assert.equal(selectingMy.id, 'owner');
  assert.deepEqual(selectingMy.targetIds, selectingTwo.targetIds);
});

test('a focused case mark follows u to i and stays attached to the actual ta', () => {
  const before = buildNoun({ ownerId: 'his', contextId: 'this' });
  const initial = resolveMarkFocus(before, { partId: 'case' });
  assert.equal(initial.character, 'ُ');
  assert.equal(initial.letter, 'ت');
  const after = buildNoun({ ownerId: 'his', contextId: 'in' });
  const focused = resolveMarkFocus(after, {
    partId: initial.partId,
    localOffset: initial.localOffset,
  });
  assert.equal(focused.character, 'ِ');
  assert.equal(focused.letter, 'ت');
  assert.equal(focused.grapheme, 'تِ');
  assert.notEqual(focused.sourceIndex, initial.sourceIndex);
  const owner = resolveMarkFocus(after, { partId: 'owner' });
  assert.equal(owner.grapheme, 'هِ');
  assert.equal(owner.letter, 'ه');
  assert.notEqual(owner.sourceIndex, focused.sourceIndex);
});

test('missing case in my and dual forms gives no invented vowel or word target', () => {
  assert.equal(resolveMarkFocus(buildNoun({ ownerId: 'my' }), { partId: 'case' }), null);
  assert.equal(resolveMarkFocus(buildNoun({ number: 'dual' }), { partId: 'case' }), null);
  assert.equal(resolveMarkFocus(buildNoun(), { partId: 'absent' }), null);
});

test('the close-up retains both stacked marks on their original consonant', () => {
  const result = buildNoun({ nounId: 'muallim', ownerId: 'my' });
  const kasraIndex = result.arabic.indexOf('ِّ') + 1;
  assert.ok(kasraIndex > 0);
  const focus = resolveMarkFocus(result, { sourceIndex: kasraIndex });
  assert.equal(focus.letter, 'ل');
  assert.equal(focus.grapheme, 'لِّ');
  assert.equal(focus.character, 'ِ');
});

test('hu to hi highlights the changed vowels, leaving the same h unringed', () => {
  const before = buildNoun({ contextId: 'this', ownerId: 'his' });
  const after = buildNoun({ contextId: 'in', ownerId: 'his' });
  const change = compareArabicResults(before, after);
  for (const [result, sources] of [
    [before, change.beforeSources],
    [after, change.afterSources],
  ]) {
    const owner = segmentRanges(result).find((part) => part.id === 'owner');
    assert.equal(result.arabic[owner.start], 'ه');
    assert.ok(!sources.includes(owner.start));
    assert.ok(sources.includes(owner.start + 1));
  }
  assert.deepEqual(change.after, ['context', 'case', 'owner']);
});

test('change stories handle words, inserted/removed tense markers and unchanged Arabic meaning changes', () => {
  const house = buildNoun({ ownerId: 'our' });
  const book = buildNoun({ nounId: 'kitab', ownerId: 'our' });
  assert.deepEqual(compareArabicResults(house, book).after, ['stem']);
  const past = buildVerb({ tenseId: 'past', personId: 'we' });
  const present = buildVerb({ tenseId: 'present', personId: 'we' });
  const tense = compareArabicResults(past, present);
  assert.ok(tense.before.includes('ending'));
  assert.ok(tense.after.includes('prefix'));
  assert.ok(tense.after.includes('case'));
  const you = buildVerb({ tenseId: 'present', personId: 'you_m' });
  const she = buildVerb({ tenseId: 'present', personId: 'she' });
  assert.equal(you.arabic, she.arabic);
  const sameInk = compareArabicResults(you, she);
  assert.equal(sameInk.changed, true);
  assert.deepEqual(sameInk.afterSources, []);
  assert.deepEqual(sameInk.afterMeaning, ['prefix', 'stem']);
  assert.equal(compareArabicResults(house, house).changed, false);
});

test('connector geometry keeps separate RTL/line targets and disappears without actual ink', () => {
  const container = { left: 100, top: 200, width: 300, height: 300 };
  const control = { left: 180, top: 450, width: 60, height: 44 };
  const targets = [
    { left: 320, top: 240, width: 10, height: 8, partId: 'prefix' },
    { left: 140, top: 310, width: 24, height: 22, partId: 'ending' },
  ];
  const geometry = connectionGeometry(container, control, targets);
  assert.equal(geometry.rings.length, 2);
  assert.deepEqual(
    geometry.rings.map((ring) => ring.partId),
    ['prefix', 'ending'],
  );
  assert.ok(geometry.rings[0].cx > geometry.rings[1].cx);
  assert.ok(geometry.rings[0].cy < geometry.rings[1].cy);
  assert.ok(!geometry.d.includes('NaN'));
  assert.equal((geometry.d.match(/M /g) || []).length, 2);
  assert.equal(connectionGeometry(container, control, []), null);
  assert.equal(connectionGeometry({ ...container, width: 0 }, control, targets), null);
});
