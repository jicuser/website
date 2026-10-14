import test from 'node:test';
import assert from 'node:assert/strict';
import { posterAppearsOnPage } from '../src/lib/programmePlacement.js';

test('adult classes require an explicitly published course placement', () => {
  const poster = { id: 'course', groups: ['education', 'youth'] };
  assert.equal(posterAppearsOnPage(poster, '/education/courses'), false);
  assert.equal(
    posterAppearsOnPage(poster, '/education/courses', [
      { source_poster_id: 'other', placement: '/education/courses' },
    ]),
    false,
  );
  assert.equal(
    posterAppearsOnPage(poster, '/education/courses', [
      { source_poster_id: 'course', placement: '/youth' },
    ]),
    false,
  );
  assert.equal(
    posterAppearsOnPage(poster, '/education/courses', [
      { source_poster_id: 'course', placement: '/education/courses' },
    ]),
    true,
  );
});

test('home and section poster placements use the same group rules', () => {
  const poster = { id: 'gathering', groups: ['home', 'worship'] };
  assert.equal(posterAppearsOnPage(poster, '/'), true);
  assert.equal(posterAppearsOnPage(poster, '/worship/daily-salah'), true);
  assert.equal(posterAppearsOnPage(poster, '/education'), false);
  assert.equal(posterAppearsOnPage({ id: 'unplaced' }, '/'), false);
});
