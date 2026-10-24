import test from 'node:test';
import assert from 'node:assert/strict';
import { guidanceQuestions } from '../src/lib/serviceGuidance.js';
test('guidance uses staff answers, respects hidden questions and falls back on invalid data', () => {
  const fallback = [['Where?', 'At the centre.']];
  assert.deepEqual(guidanceQuestions(undefined, fallback), [
    { question: 'Where?', answer: 'At the centre.', enabled: true },
  ]);
  const saved = [
    { question: 'When?', answer: 'Check the timetable.', enabled: true },
    { question: 'Hidden', answer: 'Draft', enabled: false },
  ];
  assert.equal(guidanceQuestions(saved, fallback).length, 1);
  assert.equal(guidanceQuestions(saved, fallback)[0].question, 'When?');
  assert.deepEqual(guidanceQuestions([], fallback), []);
  assert.deepEqual(guidanceQuestions('invalid', fallback), guidanceQuestions(undefined, fallback));
});
