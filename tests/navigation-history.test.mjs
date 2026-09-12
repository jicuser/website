import test from 'node:test';
import assert from 'node:assert/strict';
import { readNavigationHistory, rememberPage } from '../src/lib/navigationHistory.js';

test('Back and Forward retain the actual preceding page', () => {
  let entries = rememberPage([], 0, '/', 'POP');
  entries = rememberPage(entries, 1, '/about', 'PUSH');
  entries = rememberPage(entries, 2, '/contact', 'PUSH');
  entries = rememberPage(entries, 1, '/about', 'POP');
  assert.equal(entries.find((entry) => entry.index === 0).pathname, '/');
  entries = rememberPage(entries, 2, '/contact', 'POP');
  assert.equal(entries.find((entry) => entry.index === 1).pathname, '/about');
});

test('new navigation after Back discards the old forward branch', () => {
  let entries = rememberPage([], 0, '/prayer-times', 'POP');
  entries = rememberPage(entries, 1, '/', 'PUSH');
  entries = rememberPage(entries, 2, '/about', 'PUSH');
  entries = rememberPage(entries, 0, '/prayer-times', 'POP');
  entries = rememberPage(entries, 1, '/contact', 'PUSH');
  assert.deepEqual(entries, [
    { index: 0, pathname: '/prayer-times' },
    { index: 1, pathname: '/contact' },
  ]);
});

test('redirects replace their current entry without inventing another step', () => {
  let entries = rememberPage([], 0, '/', 'POP');
  entries = rememberPage(entries, 1, '/admin', 'PUSH');
  entries = rememberPage(entries, 1, '/admin/login', 'REPLACE');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].pathname, '/');
  assert.equal(entries[1].pathname, '/admin/login');
});

test('tab history survives reload and remains bounded', () => {
  let entries = [];
  for (let index = 0; index < 80; index++) entries = rememberPage(entries, index, '/about', 'PUSH');
  assert.equal(entries.length, 50);
  assert.deepEqual(readNavigationHistory({ getItem: () => JSON.stringify(entries) }), entries);
});

test('missing, blocked or malformed storage safely starts empty', () => {
  for (const value of [null, '{', '{}', '[null,{"index":-1,"pathname":"/"}]']) {
    assert.deepEqual(readNavigationHistory({ getItem: () => value }), []);
  }
  assert.deepEqual(
    readNavigationHistory({
      getItem() {
        throw new Error('Blocked');
      },
    }),
    [],
  );
});
