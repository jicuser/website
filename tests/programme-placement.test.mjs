import test from 'node:test';
import assert from 'node:assert/strict';
import {
  posterAppearsOnPage,
  posterPlacementLabel,
  posterWebsiteLocations,
} from '../src/lib/programmePlacement.js';

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

test('explicit poster locations override linked page listings without changing legacy publications', () => {
  const poster = { id: 'course', groups: ['home', 'education'] };
  const pages = [
    { source_poster_id: 'course', placement: '/' },
    { source_poster_id: 'course', placement: '/education/courses' },
  ];
  assert.deepEqual(posterWebsiteLocations(poster, pages), [
    '/',
    '/education',
    '/education/courses',
  ]);
  const locations = posterWebsiteLocations(poster, pages).filter((path) => path !== '/');
  const selected = { ...poster, website_locations: locations };
  assert.equal(posterAppearsOnPage(selected, '/', pages), false);
  assert.equal(posterAppearsOnPage(selected, '/education/courses', pages), true);
  assert.equal(
    posterAppearsOnPage({ ...selected, website_locations: [] }, '/education', pages),
    false,
  );
  assert.equal(posterAppearsOnPage(poster, '/', pages), true);
  assert.equal(pages[0].placement, '/');
});

test('social previews preserve legacy image posters and follow explicit selections', () => {
  const poster = { id: 'notice', image: '/poster.jpg', groups: [] };
  assert.equal(posterAppearsOnPage(poster, '/social-media'), true);
  assert.equal(posterAppearsOnPage({ ...poster, website_locations: [] }, '/social-media'), false);
  assert.equal(
    posterAppearsOnPage({ ...poster, website_locations: ['/social-media'] }, '/social-media'),
    true,
  );
  assert.equal(posterAppearsOnPage({ id: 'text-notice', groups: [] }, '/social-media'), false);
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
  assert.equal(posterPlacementLabel('home'), 'What’s on (homepage)');
  assert.equal(posterPlacementLabel('madrassah'), 'Madrassah');
});
