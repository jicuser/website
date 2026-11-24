import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSentence,
  INITIAL_SENTENCE,
  normaliseSentence,
  sentencePlaceContexts,
  SENTENCE_VERBS,
} from '../src/features/arabic/sentences.mjs';

const sentence = (patch = {}) =>
  buildSentence({
    ...INITIAL_SENTENCE,
    ...patch,
    subject: { ...INITIAL_SENTENCE.subject, ...patch.subject },
    place: { ...INITIAL_SENTENCE.place, ...patch.place },
    action: { ...INITIAL_SENTENCE.action, ...patch.action },
  });

test('a location changes the place ending without changing the subject ending', () => {
  const cases = [
    ['in', 'فِي', 'fī', 'in'],
    ['from', 'مِنْ', 'min', 'from'],
  ];
  for (const [contextId, arabic, latin, english] of cases) {
    const result = sentence({ place: { contextId } });
    assert.equal(result.arabic, `كِتَابُنَا ${arabic} بَيْتِهِ`);
    assert.equal(result.latin, `kitābunā ${latin} baytihi`);
    assert.equal(result.translation, `Our book is ${english} his house.`);
  }
});

test('location questions use English question order while retaining Arabic order', () => {
  const result = sentence({ question: true });
  assert.equal(result.arabic, 'هَلْ كِتَابُنَا فِي بَيْتِهِ؟');
  assert.equal(result.latin, 'hal kitābunā fī baytihi?');
  assert.equal(result.translation, 'Is our book in his house?');
  const withoutOwner = sentence({ question: true, subject: { ownerId: 'none' } });
  assert.equal(withoutOwner.arabic, 'هَلْ الْكِتَابُ فِي بَيْتِهِ؟');
  assert.equal(withoutOwner.translation, 'Is the book in his house?');
});

test('identifying a thing handles gender, duals and nonhuman plurals', () => {
  for (const [nounId, number, arabic, english] of [
    ['bayt', 'singular', 'هَذَا بَيْتُنَا', 'This is our house.'],
    ['madrasah', 'singular', 'هَذِهِ مَدْرَسَتُنَا', 'This is our school.'],
    ['bayt', 'dual', 'هَذَانِ بَيْتَانَا', 'These are our two houses.'],
    ['madrasah', 'dual', 'هَاتَانِ مَدْرَسَتَانَا', 'These are our two schools.'],
    ['bayt', 'plural', 'هَذِهِ بُيُوتُنَا', 'These are our houses.'],
  ]) {
    const result = sentence({ template: 'identify', subject: { nounId, number } });
    assert.equal(result.arabic, arabic);
    assert.equal(result.translation, english);
  }
});

test('identification questions retain number and owner in the English meaning', () => {
  for (const [number, english] of [
    ['singular', 'Is this our house?'],
    ['dual', 'Are these our two houses?'],
    ['plural', 'Are these our houses?'],
  ]) {
    const result = sentence({
      template: 'identify',
      question: true,
      subject: { nounId: 'bayt', number },
    });
    assert.equal(result.translation, english);
    assert.ok(result.arabic.startsWith('هَلْ '));
    assert.ok(result.arabic.endsWith('؟'));
  }
});

test('where statements use are for dual and plural subjects without changing the place', () => {
  for (const [number, arabic, english] of [
    ['dual', 'كِتَابَانَا فِي بَيْتِهِ', 'Our two books are in his house.'],
    ['plural', 'كُتُبُنَا فِي بَيْتِهِ', 'Our books are in his house.'],
  ]) {
    const result = sentence({ subject: { number } });
    assert.equal(result.arabic, arabic);
    assert.equal(result.translation, english);
  }
});

test('action sentences cover first, second and third persons across time', () => {
  for (const [personId, tenseId, arabic, latin, english] of [
    ['i', 'past', 'كَتَبْتُ', 'katabtu', 'I wrote.'],
    ['you_f', 'past', 'كَتَبْتِ', 'katabti', 'You wrote.'],
    ['he', 'past', 'كَتَبَ', 'kataba', 'He wrote.'],
    ['i', 'present', 'أَكْتُبُ', 'aktubu', 'I write.'],
    ['you_f', 'present', 'تَكْتُبِينَ', 'taktubīna', 'You write.'],
    ['he', 'present', 'يَكْتُبُ', 'yaktubu', 'He writes.'],
    ['i', 'future', 'سَأَكْتُبُ', 'sa-aktubu', 'I will write.'],
    ['you_f', 'future', 'سَتَكْتُبِينَ', 'sa-taktubīna', 'You will write.'],
    ['he', 'future', 'سَيَكْتُبُ', 'sa-yaktubu', 'He will write.'],
    ['i', 'negative_past', 'مَا كَتَبْتُ', 'mā katabtu', 'I did not write.'],
    ['you_f', 'negative_present', 'لَا تَكْتُبِينَ', 'lā taktubīna', 'You do not write.'],
    ['he', 'negative_present', 'لَا يَكْتُبُ', 'lā yaktubu', 'He does not write.'],
  ]) {
    const result = sentence({
      template: 'action',
      includePlace: false,
      action: { personId, tenseId },
    });
    assert.equal(result.arabic, arabic, `${personId} ${tenseId}`);
    assert.equal(result.latin, latin, `${personId} ${tenseId}`);
    assert.equal(result.translation, english, `${personId} ${tenseId}`);
  }
});

test('yes/no action questions preserve the exact subject and base meaning', () => {
  for (const [personId, tenseId, verbId, expected] of [
    ['i', 'past', 'kataba', 'Did I write?'],
    ['you_m', 'present', 'darasa', 'Do you study?'],
    ['he', 'present', 'darasa', 'Does he study?'],
    ['she', 'future', 'samia', 'Will she hear?'],
    ['you_two', 'past', 'kataba', 'Did you two write?'],
    ['you_m_plural', 'present', 'kataba', 'Do you all write?'],
    ['they_two_f', 'future', 'kataba', 'Will the two of them write?'],
    ['we', 'present', 'kharaja', 'Do we go out?'],
  ]) {
    const result = sentence({
      template: 'action',
      question: true,
      includePlace: false,
      action: { personId, tenseId, verbId },
    });
    assert.equal(result.translation, expected, `${personId} ${tenseId} ${verbId}`);
  }
});

test('adding a place preserves the action and grammatical owner', () => {
  const result = sentence({ template: 'action', includePlace: true, place: { ownerId: 'her' } });
  assert.equal(result.arabic, 'كَتَبْنَا فِي بَيْتِهَا');
  assert.equal(result.translation, 'We wrote in her house.');
  const question = sentence({ template: 'action', question: true });
  assert.equal(question.arabic, 'هَلْ كَتَبْنَا فِي بَيْتِهِ؟');
  assert.equal(question.translation, 'Did we write in his house?');
});

test('visible pieces reconstruct the exact written sentence and colour-mapped English', () => {
  for (const template of ['identify', 'where', 'action']) {
    for (const question of [false, true]) {
      const result = sentence({ template, question });
      assert.equal(result.segments.map((part) => part.arabic).join(''), result.arabic);
      assert.equal(result.segments.map((part) => part.latin).join(''), result.latin);
      assert.equal(result.englishParts.map((part) => part.text).join(''), result.translation);
      assert.equal(new Set(result.segments.map((part) => part.id)).size, result.segments.length);
      assert.ok(result.segments.every((part) => part.label && typeof part.arabic === 'string'));
    }
  }
});

test('negative action statements never receive the positive hal question prefix', () => {
  for (const tenseId of ['negative_present', 'negative_past']) {
    const result = sentence({
      template: 'action',
      question: true,
      includePlace: false,
      action: { tenseId },
    });
    assert.equal(result.grammar.question, false);
    assert.ok(!result.arabic.startsWith('هَلْ'));
    assert.ok(!result.translation.endsWith('?'));
    assert.match(result.notes[0].body, /Negative questions/);
  }
});

test('guided sentence choices keep location words appropriate to their pattern', () => {
  assert.deepEqual(sentencePlaceContexts('where', 'kataba'), ['in', 'from']);
  assert.deepEqual(sentencePlaceContexts('action', 'kataba'), ['in']);
  assert.deepEqual(sentencePlaceContexts('action', 'kharaja'), ['from', 'to']);
  assert.deepEqual(
    SENTENCE_VERBS.map((verb) => verb.id),
    ['kataba', 'darasa', 'shariba', 'jalasa', 'kharaja'],
  );
  const goOut = normaliseSentence({
    ...INITIAL_SENTENCE,
    template: 'action',
    action: { ...INITIAL_SENTENCE.action, verbId: 'kharaja' },
  });
  assert.equal(goOut.place.contextId, 'from');
  assert.equal(buildSentence(goOut).translation, 'We went out from his house.');
  assert.equal(sentence({ place: { contextId: 'to' } }).translation, 'Our book is in his house.');
});
