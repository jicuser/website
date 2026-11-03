import test from 'node:test';
import assert from 'node:assert/strict';
import { programmePageSize, programmePageIndex } from '../src/features/home/programmePaging.js';

test('bookmark feed has two rows per swipe, browser feed keeps three', () => {
  assert.equal(programmePageSize(true, false), 2);
  assert.equal(programmePageSize(false, false), 3);
});
test('full activity listing is never reduced to the bookmark page size', () => {
  assert.equal(programmePageSize(true, true), 3);
});
test('page index is clamped when a filtered feed shrinks', () => {
  assert.equal(programmePageIndex(1200, 400, 2), 1);
  assert.equal(programmePageIndex(-20, 400, 2), 0);
});
test('zero width or empty feed cannot produce NaN or infinity', () => {
  assert.equal(programmePageIndex(10, 0, 2), 0);
  assert.equal(programmePageIndex(500, 400, 0), 0);
  assert.equal(programmePageIndex(NaN, 400, 2), 0);
});
test('nearest page is selected after a swipe', () => {
  assert.equal(programmePageIndex(0, 400, 4), 0);
  assert.equal(programmePageIndex(398, 400, 4), 1);
  assert.equal(programmePageIndex(799, 400, 4), 2);
});
