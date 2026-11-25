import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNoun, buildVerb, CONTEXTS } from '../src/features/arabic/grammar.mjs';
import {
  INITIAL_EXPLORER_NOUN,
  buildExplorerModel,
  getExplorerNodeResult,
  explainExplorerMark,
  isExplorerContextCompatible,
} from '../src/features/arabic/arabicExplorerModel.mjs';

const node = (model, id) => model.nodes.find((item) => item.id === id);

function assertSourceTree(model) {
  assert.equal(new Set(model.nodes.map((item) => item.id)).size, model.nodes.length);
  for (const item of model.nodes) {
    assert.equal(model.result.arabic.slice(item.sourceStart, item.sourceEnd), item.arabic, item.id);
    const slice = getExplorerNodeResult(model, item.id);
    assert.equal(slice.segments.map((part) => part.arabic).join(''), slice.arabic, item.id);
    assert.equal(slice.segments.map((part) => part.latin).join(''), slice.latin, item.id);
    if (item.parentId) {
      const parent = node(model, item.parentId);
      assert.ok(parent.children.includes(item.id));
      assert.ok(item.sourceStart >= parent.sourceStart && item.sourceEnd <= parent.sourceEnd);
      assert.equal(model.structureEdges.filter((edge) => edge.to === item.id).length, 1);
    }
  }
  for (const edge of model.structureEdges) {
    assert.equal(edge.type, 'structure');
    assert.equal(node(model, edge.to).parentId, edge.from);
  }
  for (const rule of model.ruleEdges) {
    assert.equal(rule.type, 'rule');
    assert.ok(node(model, rule.from));
    assert.ok(node(model, rule.to));
    for (const index of rule.targetSourceIndices) {
      const target = node(model, rule.to);
      assert.ok(index >= target.sourceStart && index < target.sourceEnd);
    }
  }
}

test('the starting sentence contains words, and only the noun contains house + my', () => {
  const model = buildExplorerModel();
  assert.equal(model.result.arabic, 'هَذَا بَيْتِي');
  assert.equal(model.result.translation, 'This is my house');
  assert.equal(INITIAL_EXPLORER_NOUN.ownerId, 'my');
  assert.deepEqual(model.wordIds, ['word:context:0', 'word:noun']);
  assert.deepEqual(node(model, 'sentence').children, model.wordIds);
  assert.deepEqual(node(model, 'word:noun').children, ['part:stem', 'part:owner']);
  assert.equal(node(model, 'part:stem').latin, 'bayt');
  assert.equal(node(model, 'part:owner').latin, 'ī');
  assert.equal(node(model, 'part:owner').selector, 'owner');
  assert.equal(node(model, 'word:context:0').meaning, 'This');
  assert.equal(node(model, 'word:context:0').familyId, 'pointing');
  assert.equal(node(model, 'part:case'), undefined);
  assert.equal(
    model.structureEdges.some((edge) => edge.from === 'sentence' && edge.to === 'part:stem'),
    false,
  );
  assertSourceTree(model);
});

test('families classify replacement meanings and disable incompatible action choices without changing the noun', () => {
  const model = buildExplorerModel();
  assert.deepEqual(
    model.families.map((family) => family.id),
    ['pointing', 'location', 'actions'],
  );
  assert.deepEqual(
    model.families[0].options.map((option) => option.id),
    ['this', 'that'],
  );
  assert.deepEqual(
    model.families[1].options.map((option) => option.id),
    ['in', 'from', 'to'],
  );
  assert.deepEqual(
    model.families[2].options.map((option) => option.id),
    ['saw', 'opened', 'entered'],
  );
  const opened = model.families[2].options.find((option) => option.id === 'opened');
  assert.equal(opened.disabled, true);
  assert.match(opened.reason, /door, book, letter/u);
  assert.equal(opened.exampleOnly, true);
  assert.equal(opened.result.translation, 'I opened my door');
  assert.deepEqual(opened.patch, { contextId: 'opened' });
  assert.equal(model.families[2].options.find((option) => option.id === 'entered').disabled, false);
  assert.equal(isExplorerContextCompatible('entered', 'bayt'), true);
  assert.equal(isExplorerContextCompatible('entered', 'kitab'), false);
  assert.equal(isExplorerContextCompatible('opened', 'kitab'), true);
  assert.equal(isExplorerContextCompatible('that', 'kitab'), true);
  assert.equal(isExplorerContextCompatible('not-a-context', 'bayt'), false);
});

test('action words have actual action + I children and corresponding colours/English IDs', () => {
  for (const [contextId, nounId, stemArabic, stemLatin] of [
    ['saw', 'bayt', 'رَأَيْ', 'raʾay'],
    ['opened', 'bab', 'فَتَحْ', 'fataḥ'],
    ['entered', 'bayt', 'دَخَلْ', 'dakhal'],
  ]) {
    const raw = buildNoun({ ...INITIAL_EXPLORER_NOUN, contextId, nounId });
    const model = buildExplorerModel({ noun: { contextId, nounId }, result: raw });
    assert.equal(raw.segments[0].id, 'context', 'the existing engine contract remains intact');
    assert.equal(model.result.arabic, raw.arabic);
    assert.equal(model.result.latin, raw.latin);
    assert.equal(model.result.translation, raw.translation);
    assert.equal(model.result.englishParts.map((part) => part.text).join(''), raw.translation);
    assert.deepEqual(
      model.result.englishParts.slice(0, 2).map((part) => part.id),
      ['context:ending', 'context:stem'],
    );
    assert.equal(model.result.englishParts[0].text, 'I ');
    assert.equal(node(model, 'word:context:0').familyId, 'actions');
    assert.deepEqual(node(model, 'word:context:0').children, [
      'part:context:stem',
      'part:context:ending',
    ]);
    assert.equal(node(model, 'part:context:stem').arabic, stemArabic);
    assert.equal(node(model, 'part:context:stem').latin, stemLatin);
    assert.equal(node(model, 'part:context:ending').arabic, 'تُ');
    assert.deepEqual(node(model, 'part:context:ending').segmentIds, ['context:ending']);
    assert.equal(node(model, 'word:noun').meaning, `my ${nounId === 'bab' ? 'door' : 'house'}`);
    const detail = explainExplorerMark(model, node(model, 'part:context:ending').sourceEnd - 1);
    assert.equal(detail.kind, 'person');
    assert.equal(detail.selector, 'context');
    assertSourceTree(model);
  }
});

test('location → noun kasra → his sound is a rule chain, not a structural ancestry', () => {
  const model = buildExplorerModel({ noun: { contextId: 'in', ownerId: 'his' } });
  assert.equal(model.result.arabic, 'فِي بَيْتِهِ');
  const role = model.ruleEdges.find((rule) => rule.id === 'noun-role');
  const sound = model.ruleEdges.find((rule) => rule.id === 'owner-sound');
  assert.deepEqual([role.from, role.to], ['word:context:0', 'part:case']);
  assert.deepEqual([sound.from, sound.to], ['part:case', 'part:owner']);
  assert.equal(sound.effect, 'sound-change');
  assert.deepEqual(sound.targetSourceIndices, [node(model, 'part:owner').sourceEnd - 1]);
  assert.equal(model.result.arabic[sound.targetSourceIndices[0]], 'ِ');
  const explanation = explainExplorerMark(model, node(model, 'part:case').sourceStart);
  assert.equal(explanation.kind, 'case');
  assert.deepEqual(explanation.ruleIds, ['noun-role', 'owner-sound']);
  assert.ok(explanation.examples.some((example) => example.familyId === 'actions'));
  assert.equal(
    model.structureEdges.some((edge) => edge.from === role.from && edge.to === role.to),
    false,
  );
  assertSourceTree(model);
});

test('my and fused number+my retain their actual joined ending and never gain a fake case part', () => {
  for (const noun of [
    {},
    { number: 'dual', contextId: 'in' },
    { nounId: 'muallim', number: 'plural' },
  ]) {
    const model = buildExplorerModel({ noun });
    assert.equal(node(model, 'part:case'), undefined);
    assert.equal(node(model, 'part:number'), undefined);
    assert.deepEqual(node(model, 'word:noun').children, ['part:stem', 'part:owner']);
    const owner = node(model, 'part:owner');
    const explanation = explainExplorerMark(model, owner.sourceStart);
    assert.equal(explanation.kind, 'owner');
    assert.equal(explanation.selector, 'owner');
    assert.ok(explanation.ruleIds.includes('joined-my-role'));
    assertSourceTree(model);
  }
  const explanation = explainExplorerMark(buildExplorerModel(), 11);
  assert.match(explanation.body, /kasra and yāʾ together/u);
  assert.match(explanation.body, /no separate visible case vowel/u);
});

test('far pointing and separating pronouns remain actual source words', () => {
  const model = buildExplorerModel({
    noun: { contextId: 'that', ownerId: 'none', definiteness: 'definite' },
  });
  assert.deepEqual(model.wordIds, ['word:context:0', 'word:context:1', 'word:noun']);
  assert.equal(node(model, 'word:context:0').arabic, 'ذَلِكَ');
  assert.equal(node(model, 'word:context:0').meaning, 'That');
  assert.equal(node(model, 'word:context:1').arabic, 'هُوَ');
  assert.equal(node(model, 'word:context:1').selector, null);
  assert.equal(node(model, 'word:context:1').meaning, 'he / it');
  assertSourceTree(model);
});

test('negative sentences keep negation on its own word and the verb word keeps its positive meaning', () => {
  for (const [personId, tenseId, wordArabic, wordMeaning, wholeMeaning] of [
    ['we', 'negative_present', 'نَكْتُبُ', 'We write', 'We do not write'],
    ['he', 'negative_present', 'يَكْتُبُ', 'He writes', 'He does not write'],
    ['we', 'negative_past', 'كَتَبْنَا', 'We wrote', 'We did not write'],
    ['she', 'negative_past', 'كَتَبَتْ', 'She wrote', 'She did not write'],
  ]) {
    const verb = { personId, tenseId };
    const result = buildVerb(verb);
    const model = buildExplorerModel({ mode: 'verb', verb, result });
    assert.equal(model.result, result, 'the full sentence and segmentation remain untouched');
    assert.equal(model.result.translation, wholeMeaning);
    assert.equal(node(model, 'word:verb').arabic, wordArabic);
    assert.equal(node(model, 'word:verb').meaning, wordMeaning);
    assert.equal(node(model, 'word:context:0').selector, 'tense');
    assertSourceTree(model);
  }
});

test('checked noun and verb shapes keep exact source ranges, including attached future and separate negatives', () => {
  for (const context of CONTEXTS) {
    for (const noun of [
      { nounId: 'bayt', ownerId: 'our' },
      { nounId: 'madrasah', ownerId: 'my' },
      { nounId: 'bayt', ownerId: 'my', number: 'dual' },
      { nounId: 'masjid', ownerId: 'none', number: 'plural' },
      { nounId: 'muallim', ownerId: 'his', number: 'plural' },
      { nounId: 'muallimah', ownerId: 'none', number: 'plural', definiteness: 'definite' },
    ])
      assertSourceTree(buildExplorerModel({ noun: { ...noun, contextId: context.id } }));
  }
  for (const tenseId of ['past', 'present', 'future', 'negative_present', 'negative_past'])
    for (const personId of ['we', 'you_f', 'he', 'they_f']) {
      const verb = { tenseId, personId };
      const model = buildExplorerModel({ mode: 'verb', verb, result: buildVerb(verb) });
      assertSourceTree(model);
      assert.equal(node(model, 'word:verb').children.length > 1, true);
      if (tenseId === 'future') assert.equal(node(model, 'part:context').selector, 'tense');
      if (tenseId.startsWith('negative_'))
        assert.equal(node(model, 'word:context:0').selector, 'tense');
    }
  assert.equal(getExplorerNodeResult(buildExplorerModel(), 'missing'), null);
  assert.equal(explainExplorerMark(buildExplorerModel(), 0), null);
});
