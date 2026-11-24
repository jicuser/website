import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/features/services/catalog.js';
import { READ_LEARN_RESOURCES, getVisibleReadLearnResources } from '../src/content/readLearn.js';

function findServices(options) {
  assert.equal(typeof catalog.filterServices, 'function', 'The service filter must be available');
  return catalog.filterServices(options);
}

test('the catalogue connects each JIC service to its existing destination', () => {
  const destinations = Object.fromEntries(
    (catalog.SERVICE_CATALOG || []).map(({ id, to }) => [id, to]),
  );
  const existing = {
    prayer: '/prayer-times',
    learning: '/education',
    madrassah: '/madrassah',
    nikah: '/services/nikah',
    funerals: '/funerals',
    hall: '/services/hall-booking',
    youth: '/youth',
    community: '/get-involved/volunteer',
    giving: '/donate',
    portal: '/portal',
  };
  for (const [id, to] of Object.entries(existing)) assert.equal(destinations[id], to);
  for (const id of ['support', 'family', 'careers', 'ramadan']) assert.ok(destinations[id]);
});

test('an empty search includes the catalogue in its editorial order', () => {
  assert.deepEqual(findServices({ query: '   ' }), catalog.SERVICE_CATALOG);
});

test('search finds everyday language as well as service names', () => {
  assert.deepEqual(
    findServices({ query: '  MARRIAGE  ' }).map(({ id }) => id),
    ['family', 'nikah'],
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
    ['learning', 'madrassah'],
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
    ['learning', 'madrassah'],
  );
});

test('categories narrow the results and combine with search', () => {
  assert.deepEqual(
    findServices({ category: 'learning' }).map(({ id }) => id),
    ['careers', 'learning', 'madrassah'],
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
  assert.equal(visible.length, catalog.SERVICE_CATALOG.length - 2);
  assert.equal(
    visible.some(({ id }) => ['nikah', 'portal'].includes(id)),
    false,
  );
  assert.deepEqual(
    findServices({ query: 'marriage', getContent }).map(({ id }) => id),
    ['family'],
  );
  assert.deepEqual(
    findServices({ category: 'account', getContent }).map(({ id }) => id),
    [],
  );
  assert.equal(findServices({ category: 'life-events', getContent }).length, 3);
});

test('certificate search leads to the portal instead of a standalone service', () => {
  const results = findServices({ query: 'certificate' });
  assert.deepEqual(
    results.map(({ to }) => to),
    ['/portal'],
  );
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
  assert.deepEqual(
    findServices({ query: 'children', getContent }).map(({ id }) => id),
    ['learning'],
  );

  content.set('page-visibility:/madrassah', 'true');
  assert.deepEqual(
    findServices({ query: 'children', getContent }).map(({ id }) => id),
    ['learning', 'madrassah'],
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

test('website readers and Arabic learning are discovered separately from mosque services', () => {
  const tools = READ_LEARN_RESOURCES.map(({ to }) => to);
  assert.deepEqual(
    READ_LEARN_RESOURCES.filter(({ category }) => category === 'read').map(({ to }) => to),
    ['/worship/quran', '/worship/daily-duas'],
  );
  assert.deepEqual(
    READ_LEARN_RESOURCES.filter(({ category }) => category === 'learn').map(({ to }) => to),
    ['/learning/arabic'],
  );
  assert.equal(new Set(tools).size, tools.length);
  assert(catalog.SERVICE_CATALOG.every(({ to }) => !tools.includes(to)));
  assert.equal(tools.includes('/prayer-times'), false);
  assert.deepEqual(findServices({ query: 'adhkar' }), []);
});

test('Dala’il remains accurate programme information rather than an advertised text reader', () => {
  const programme = READ_LEARN_RESOURCES.find(({ id }) => id === 'dalail');
  assert.equal(programme.to, '/worship/dalail-al-khayrat');
  assert.equal(programme.category, 'guide');
  assert.equal(programme.kind, 'programme');
  assert.match(programme.title, /programme/);
  assert.match(programme.description, /sessions.*contact/i);
});

test('Read & Learn visibility hides the section and checks individual destinations on each call', () => {
  const content = new Map();
  const getContent = (key, fallback) => content.get(key) ?? fallback;
  const original = structuredClone(READ_LEARN_RESOURCES);
  assert.equal(getVisibleReadLearnResources(getContent).length, 6);
  content.set('page-visibility:/worship/quran', 'false');
  content.set('page-visibility:/learning/arabic', 'false');
  assert.deepEqual(
    getVisibleReadLearnResources(getContent).map(({ id }) => id),
    ['adhkar', 'salah-guide', 'janazah-guide', 'dalail'],
  );
  content.set('page-visibility:/worship', 'false');
  assert.deepEqual(getVisibleReadLearnResources(getContent), []);
  content.set('page-visibility:/worship', 'true');
  content.set('page-visibility:/worship/quran', 'true');
  assert.equal(getVisibleReadLearnResources(getContent)[0].id, 'quran');
  assert.deepEqual(READ_LEARN_RESOURCES, original);
});
