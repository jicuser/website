import test from 'node:test';
import assert from 'node:assert/strict';
import { posterAppearsOnPage, posterPlacementLabel } from '../src/lib/programmePlacement.js';

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

test('group placements appear on overviews, without repeating on focused subpages', () => {
  const poster = { id: 'gathering', groups: ['home', 'worship'] };
  assert.equal(posterAppearsOnPage(poster, '/'), true);
  assert.equal(posterAppearsOnPage(poster, '/worship'), true);
  assert.equal(posterAppearsOnPage(poster, '/worship/daily-salah'), false);
  assert.equal(posterAppearsOnPage(poster, '/education'), false);
  assert.equal(posterAppearsOnPage({ id: 'unplaced' }, '/'), false);
  const pupilPoster = { id: 'pupils', groups: ['education', 'madrassah'] };
  for (const path of [
    '/education/enrolment',
    '/madrassah/enrolment',
    '/madrassah/policies',
    '/madrassah/contact',
  ]) {
    assert.equal(posterAppearsOnPage(pupilPoster, path), false, path);
  }
});

test('explicit listings remain available and overview labels match public navigation', () => {
  const poster = { id: 'skills', groups: [] };
  assert.equal(
    posterAppearsOnPage(poster, '/youth/classes-skills', [
      { source_poster_id: 'skills', placement: '/youth/classes-skills' },
    ]),
    true,
  );
  assert.equal(posterPlacementLabel('home'), 'Home');
  assert.equal(posterPlacementLabel('madrassah'), 'Madrassah');
});
