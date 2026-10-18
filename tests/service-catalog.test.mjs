import test from 'node:test';
import assert from 'node:assert/strict';
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
    prayer: '/prayer-times',
    learning: '/education',
    madrassah: '/madrassah',
    nikah: '/services/nikah',
    funerals: '/funerals',
    hall: '/services/hall-booking',
    certificates: '/services/certificates',
    youth: '/youth',
    community: '/get-involved',
    giving: '/donate',
    portal: '/portal',
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
    findServices({ query: 'SaLaH' }).map(({ id }) => id),
    ['prayer'],
  );
  assert.deepEqual(
    findServices({ query: 'preferred date' }).map(({ id }) => id),
    ['hall'],
  );
});

test('every search word must match the same service', () => {
  assert.deepEqual(
    findServices({ query: 'quran children' }).map(({ id }) => id),
    ['madrassah'],
  );
  assert.deepEqual(findServices({ query: 'quran funeral' }), []);
});

test('search handles apostrophes and accents in visitor input', () => {
  assert.deepEqual(
    findServices({ query: 'JAMA\u0027AH' }).map(({ id }) => id),
    ['prayer'],
  );
  assert.deepEqual(
    findServices({ query: 'madrássah' }).map(({ id }) => id),
    ['madrassah'],
  );
});

test('categories narrow the results and combine with search', () => {
  assert.deepEqual(
    findServices({ category: 'learning' }).map(({ id }) => id),
    ['learning', 'madrassah'],
  );
  assert.deepEqual(
    findServices({ category: 'learning', query: 'parent' }).map(({ id }) => id),
    ['madrassah'],
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
  assert.equal(visible.length, 9);
  assert.equal(
    visible.some(({ id }) => ['nikah', 'portal'].includes(id)),
    false,
  );
  assert.deepEqual(findServices({ query: 'marriage', getContent }), []);
  assert.deepEqual(
    findServices({ category: 'account', getContent }).map(({ id }) => id),
    ['certificates'],
  );
  assert.equal(findServices({ category: 'life-events', getContent }).length, 2);
});

test('certificate search offers the public guidance destination', () => {
  const results = findServices({ query: 'certificate' });
  assert.ok(results.some(({ to }) => to === '/services/certificates'));
});

test('hidden certificate guidance stays out of search while the portal remains available', () => {
  const getContent = (key, fallback) =>
    key === 'page-visibility:/services/certificates' ? 'false' : fallback;
  const results = findServices({ query: 'certificate', getContent });
  assert.equal(
    results.some(({ to }) => to === '/services/certificates'),
    false,
  );
  assert.ok(results.some(({ to }) => to === '/portal'));
});

test('a new CMS visibility value changes the results without changing the catalogue', () => {
  const content = new Map([['page-visibility:/madrassah', 'false']]);
  const getContent = (key, fallback) => content.get(key) ?? fallback;
  assert.deepEqual(findServices({ query: 'children', getContent }), []);

  content.set('page-visibility:/madrassah', 'true');
  assert.deepEqual(
    findServices({ query: 'children', getContent }).map(({ id }) => id),
    ['madrassah'],
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
