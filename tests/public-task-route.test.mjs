import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicTaskRoute } from '../src/lib/publicTaskRoute.js';

test('public task policy accepts trailing slashes without matching similarly named content routes', () => {
  for (const path of [
    '/services/hall-booking',
    '/services',
    '/services/support',
    '/funerals',
    '/forms/contact-us',
    '/prayer-times/reminders',
    '/contact',
    '/ramadan/sponsor',
    '/learning/arabic',
  ]) {
    assert.equal(isPublicTaskRoute(path), true, path);
    assert.equal(isPublicTaskRoute(`${path}/`), true, `${path}/`);
  }
  for (const path of [
    '/',
    '/prayer-times',
    '/education/courses',
    '/contact-details',
    '/ramadan-guide',
    '/learning/arabic-history',
  ])
    assert.equal(isPublicTaskRoute(path), false, path);
});
