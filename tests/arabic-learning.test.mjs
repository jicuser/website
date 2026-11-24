import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAMMAR_TOPICS,
  PRACTICE_QUESTIONS,
  PRACTICE_STORAGE_KEY,
  createPracticeRound,
  readPracticeProgress,
  writePracticeProgress,
} from '../src/features/arabic/learningContent.mjs';
import { buildNoun, buildVerb } from '../src/features/arabic/grammar.mjs';

const allQuestionIds = PRACTICE_QUESTIONS.map((question) => question.id);
const firstRound = [
  'my-house',
  'our-house',
  'in-our-house',
  'her-ending',
  'in-his-house',
  'from-our-house',
];

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('a new learner begins with six familiar house and owner patterns', () => {
  assert.deepEqual(createPracticeRound(), firstRound);
  assert.deepEqual(createPracticeRound([], 0), firstRound);
});

test('a later round prioritises five unseen patterns and brings back one familiar pattern', () => {
  const mastered = [...firstRound];
  assert.deepEqual(createPracticeRound(mastered, 1), [
    'to-her-house',
    'saw-our-house',
    'my-hidden-vowel',
    'your-man',
    'your-woman',
    'my-house',
  ]);
  assert.deepEqual(mastered, firstRound, 'planning a round must not mutate saved progress');
});

test('the last unseen pattern is not lost when most of the question bank has been learned', () => {
  const mastered = allQuestionIds.slice(0, -1);
  assert.deepEqual(createPracticeRound(mastered), [
    'meaning-vs-role',
    'my-house',
    'our-house',
    'in-our-house',
    'her-ending',
    'in-his-house',
  ]);
});

test('a fully learned bank still offers six distinct review questions and rotates later rounds', () => {
  assert.deepEqual(createPracticeRound(allQuestionIds, 0), firstRound);
  assert.deepEqual(createPracticeRound(allQuestionIds, 1), [
    'to-her-house',
    'saw-our-house',
    'my-hidden-vowel',
    'your-man',
    'your-woman',
    'the-house',
  ]);
  for (let round = 0; round < 20; round += 1) {
    const selection = createPracticeRound(allQuestionIds, round);
    assert.equal(selection.length, 6);
    assert.equal(new Set(selection).size, 6);
    assert(selection.every((id) => allQuestionIds.includes(id)));
  }
});

test('progress survives a reload with only known, unique question IDs stored', () => {
  const storage = memoryStorage();
  assert.equal(
    writePracticeProgress(storage, ['my-house', 'my-house', 'our-house', 'unknown']),
    true,
  );
  const saved = JSON.parse(storage.getItem(PRACTICE_STORAGE_KEY));
  assert.deepEqual(saved, { version: 1, mastered: ['my-house', 'our-house'] });

  const afterReload = memoryStorage({ [PRACTICE_STORAGE_KEY]: JSON.stringify(saved) });
  assert.deepEqual(readPracticeProgress(afterReload), ['my-house', 'our-house']);
  const nextRound = createPracticeRound(readPracticeProgress(afterReload));
  assert.equal(nextRound.filter((id) => saved.mastered.includes(id)).length, 1);
  assert.equal(nextRound.filter((id) => !saved.mastered.includes(id)).length, 5);
});

test('clearing local progress returns practice to the first round', () => {
  const storage = memoryStorage();
  writePracticeProgress(storage, firstRound);
  storage.removeItem(PRACTICE_STORAGE_KEY);
  assert.deepEqual(readPracticeProgress(storage), []);
  assert.deepEqual(createPracticeRound(readPracticeProgress(storage)), firstRound);
});

test('malformed, old and incorrectly shaped saved data cannot break practice', () => {
  for (const stored of [
    '{invalid-json',
    'null',
    '42',
    '[]',
    '{"version":0,"mastered":["my-house"]}',
    '{"version":1,"mastered":"my-house"}',
    '{"version":1,"mastered":null}',
    '{"mastered":["my-house"]}',
  ]) {
    assert.deepEqual(readPracticeProgress(memoryStorage({ [PRACTICE_STORAGE_KEY]: stored })), []);
  }
  const mixed = memoryStorage({
    [PRACTICE_STORAGE_KEY]: JSON.stringify({
      version: 1,
      mastered: ['unknown', null, 3, {}, 'my-house', 'my-house'],
    }),
  });
  assert.deepEqual(readPracticeProgress(mixed), ['my-house']);
});

test('blocked reads and full or unavailable storage degrade to session-only practice', () => {
  const blockedStorage = {
    getItem() {
      throw new Error('Storage blocked');
    },
    setItem() {
      throw new Error('Storage full');
    },
  };
  assert.deepEqual(readPracticeProgress(blockedStorage), []);
  assert.deepEqual(readPracticeProgress(null), []);
  assert.deepEqual(readPracticeProgress(), []);
  assert.equal(writePracticeProgress(blockedStorage, firstRound), false);
  assert.equal(writePracticeProgress(null, firstRound), false);
  assert.deepEqual(createPracticeRound(readPracticeProgress(blockedStorage)), firstRound);
});

test('every authored question has a unique identity, a usable answer and an explanation', () => {
  assert.equal(PRACTICE_QUESTIONS.length, 20);
  assert.equal(new Set(allQuestionIds).size, PRACTICE_QUESTIONS.length);
  for (const question of PRACTICE_QUESTIONS) {
    assert(question.options.length >= 3 && question.options.length <= 4, question.id);
    assert(Number.isInteger(question.answer), question.id);
    const answer = question.options[question.answer];
    assert(answer && (answer.label || (answer.ar && answer.latin)), question.id);
    assert(question.explanation.trim().length > 0, question.id);
  }
});

test('every Explorer shortcut opens a supported builder state with its intended meaning', () => {
  const expected = {
    pieces: ['هَذَا بَيْتُنَا', 'This is our house'],
    whose: ['هَذَا بَيْتُهَا', 'This is her house'],
    position: ['فِي بَيْتِنَا', 'In our house'],
    my: ['فِي بَيْتِي', 'In my house'],
    many: ['هَذَانِ بَيْتَانِ', 'These are two houses'],
    which: ['الْبَيْتُ', 'The house'],
    matching: ['هَذِهِ مَدْرَسَتِي', 'This is my school'],
    where: ['فِي بَيْتِهِ', 'In his house'],
    actions: ['كَتَبْنَا', 'We wrote'],
    families: ['هَذَا كِتَابِي', 'This is my book'],
    sentences: ['هَذَا كِتَابِي', 'This is my book'],
    questions: ['أَكْتُبُ', 'I write'],
  };
  assert.deepEqual(GRAMMAR_TOPICS.map((topic) => topic.id).sort(), Object.keys(expected).sort());
  for (const topic of GRAMMAR_TOPICS) {
    assert(['noun', 'verb'].includes(topic.tryState.mode), topic.id);
    const result =
      topic.tryState.mode === 'verb' ? buildVerb(topic.tryState) : buildNoun(topic.tryState);
    assert.deepEqual([result.arabic, result.translation], expected[topic.id], topic.id);
  }
});
