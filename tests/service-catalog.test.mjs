import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPages } from '../src/lib/siteSearch.js';
import * as catalog from '../src/features/services/catalog.js';

function findServices(options) {
  assert.equal(typeof catalog.filterServices, 'function', 'The service filter must be available');
  return catalog.filterServices(options);
}

test('the catalogue connects each JIC service to its existing destination', () => {
  const destinations = Object.fromEntries(
    (catalog.SERVICE_CATALOG || []).map(({ id, to }) => [id, to]),
  );
  assert.deepEqual(destinations, {
    support: '/services/support',
    learning: '/education',
    careers: '/services/skills-careers',
    nikah: '/services/nikah',
    funerals: '/funerals',
    hall: '/services/hall-booking',
    youth: '/youth',
    community: '/get-involved/volunteer',
  });
});

test('an empty search includes the catalogue in its editorial order', () => {
  assert.deepEqual(findServices({ query: '   ' }), catalog.SERVICE_CATALOG);
});

test('search finds everyday language as well as service names', () => {
  assert.deepEqual(
    findServices({ query: '  MARRIAGE  ' }).map(({ id }) => id),
    ['nikah'],
  );
  assert.deepEqual(
    searchPages('SaLaH')
      .filter(({ path }) => path === '/prayer-times')
      .map(({ path }) => path),
    ['/prayer-times'],
  );
  assert.deepEqual(
    findServices({ query: 'preferred date' }).map(({ id }) => id),
    ['hall'],
  );
});

test('every search word must match the same service', () => {
  assert.deepEqual(
    findServices({ query: 'quran children' }).map(({ id }) => id),
    ['learning'],
  );
  assert.deepEqual(findServices({ query: 'quran funeral' }), []);
});

test('search handles apostrophes and accents in visitor input', () => {
  assert.deepEqual(
    searchPages('JAMA\u0027AH')
      .filter(({ path }) => path === '/prayer-times')
      .map(({ path }) => path),
    ['/prayer-times'],
  );
  assert.deepEqual(
    findServices({ query: 'madrássah' }).map(({ id }) => id),
    ['learning'],
  );
});

test('categories narrow the results and combine with search', () => {
  assert.deepEqual(
    findServices({ category: 'learning' }).map(({ id }) => id),
    ['learning', 'careers'],
  );
  assert.deepEqual(
    findServices({ category: 'learning', query: 'parent' }).map(({ id }) => id),
    ['learning'],
  );
  assert.deepEqual(findServices({ category: 'giving', query: 'nikah' }), []);
});

test('CMS-hidden destinations stay hidden in every discovery mode', () => {
  const getContent = (key, fallback) =>
    ['page-visibility:/services/nikah', 'page-visibility:/portal'].includes(key)
      ? 'false'
      : fallback;

  assert.equal(
    typeof catalog.getVisibleServices,
    'function',
    'Visibility filtering must be available',
  );
  const visible = catalog.getVisibleServices(getContent);
  assert.equal(visible.length, 7);
  assert.equal(
    visible.some(({ id }) => ['nikah', 'portal'].includes(id)),
    false,
  );
  assert.deepEqual(findServices({ query: 'marriage', getContent }), []);
  assert.deepEqual(
    findServices({ category: 'account', getContent }).map(({ id }) => id),
    [],
  );
  assert.equal(findServices({ category: 'life-events', getContent }).length, 2);
});

test('certificate search leads to the portal instead of a standalone service', () => {
  const results = searchPages('certificate').filter(({ path }) => path === '/portal');
  assert.deepEqual(
    results.map(({ path }) => path),
    ['/portal'],
  );
});

test('certificate guidance stays in account utilities and outside the eight service groups', () => {
  assert.deepEqual(findServices({ query: 'certificate' }), []);
  assert.ok(searchPages('certificate').some(({ path }) => path === '/portal'));
});

test('a new CMS visibility value changes the results without changing the catalogue', () => {
  const content = new Map([['page-visibility:/education', 'false']]);
  const getContent = (key, fallback) => content.get(key) ?? fallback;
  assert.deepEqual(findServices({ query: 'children', getContent }), []);

  content.set('page-visibility:/education', 'true');
  assert.deepEqual(
    findServices({ query: 'children', getContent }).map(({ id }) => id),
    ['learning'],
  );
});

test('unmatched text and unknown categories return an empty result', () => {
  assert.deepEqual(findServices({ query: 'unlisted-service-xyz' }), []);
  assert.deepEqual(findServices({ category: 'unlisted-category' }), []);
});

test('filtering never reorders or changes the shared catalogue', () => {
  const original = structuredClone(catalog.SERVICE_CATALOG);
  const results = findServices({ category: 'learning', query: 'class' });
  assert.notEqual(results, catalog.SERVICE_CATALOG);
  assert.deepEqual(catalog.SERVICE_CATALOG, original);
});
