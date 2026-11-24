import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUB_GROUPS,
  normaliseHubLayout,
  buildHubCards,
  moveHubCard,
  safeHubImage,
} from '../src/features/services/hubLayout.js';
const services = [
  ['funerals', '/funerals'],
  ['janazah-guide', '/worship/janazah-guide'],
  ['family', '/services/marriage-family'],
  ['nikah', '/services/nikah'],
  ['adhkar', '/worship/daily-duas'],
  ['quran', '/worship/quran'],
  ['salah-guide', '/worship/prayer-guide'],
  ['dalail', '/worship/dalail-al-khayrat'],
  ['learning', '/education'],
  ['madrassah', '/madrassah'],
  ['youth', '/youth'],
  ['support', '/services/support'],
  ['careers', '/services/skills-careers'],
  ['hall', '/services/hall-booking'],
].map(([id, to]) => ({ id, to, title: id }));
test('seven stable mosque service groups keep online reading and learning separate', () => {
  const cards = buildHubCards(services);
  assert.equal(cards.length, 7);
  assert.deepEqual(
    cards.map((c) => c.id),
    ['funerals', 'family', 'learning', 'youth', 'support', 'careers', 'hall'],
  );
  assert.equal(new Set(cards.flatMap((c) => c.serviceIds)).size, 9);
  assert.ok(
    cards.every((card) => card.services.every((service) => !service.to.startsWith('/worship/'))),
  );
});
test('invalid or absent stored settings recover safely', () => {
  for (const input of [undefined, null, '', '{oops', '[]', 'null', '17', 17, [], true])
    assert.deepEqual(normaliseHubLayout(input), normaliseHubLayout());
});
test('normalisation rejects unknown ids, duplicates, colours and keys', () => {
  const value = normaliseHubLayout({
    order: ['hall', 'hall', 'fake'],
    hidden: ['careers', 'fake'],
    colours: { hall: 'javascript:bad', family: 'rose' },
    anything: 'ignored',
  });
  assert.equal(value.order.length, 7);
  assert.equal(value.order[0], 'hall');
  assert.deepEqual(value.hidden, ['careers']);
  assert.equal(value.colours.family, 'rose');
  assert.equal(value.colours.hall, HUB_GROUPS.find((g) => g.id === 'hall').tone);
  assert.equal(value.anything, undefined);
});
test('group visibility does not mutate the catalogue or saved configuration', () => {
  const config = normaliseHubLayout({ hidden: ['learning'] });
  const before = JSON.stringify(config);
  assert.equal(buildHubCards(services, config).length, 6);
  assert.equal(services.length, 14);
  assert.equal(JSON.stringify(config), before);
});
test('groups with no visible members are omitted rather than linking to disabled pages', () => {
  const cards = buildHubCards(services.filter((s) => !['family', 'nikah'].includes(s.id)));
  assert.equal(
    cards.some((c) => c.id === 'family'),
    false,
  );
});
test('a visible fallback is used when the preferred destination is unavailable', () => {
  const cards = buildHubCards(services.filter((s) => s.id !== 'family'));
  assert.equal(cards.find((c) => c.id === 'family').to, '/services/nikah');
});
test('legacy saved worship settings cannot put online readers back into service cards', () => {
  const saved = {
    order: ['worship', 'hall', 'family'],
    hidden: ['worship'],
    colours: { worship: 'gold', family: 'rose' },
  };
  const layout = normaliseHubLayout(saved);
  assert.equal(layout.order.includes('worship'), false);
  assert.equal(layout.order[0], 'hall');
  assert.equal(layout.colours.family, 'rose');
  assert.equal(
    buildHubCards(services, layout).some((card) => card.id === 'worship'),
    false,
  );
});
test('only supplied visible destinations appear in group members', () => {
  const cards = buildHubCards(
    services.filter((s) => s.id === 'nikah'),
    undefined,
    () => false,
  );
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].serviceIds, ['nikah']);
  assert.equal(cards[0].to, '/services/nikah');
  assert.deepEqual(buildHubCards(services.filter((s) => s.id === 'quran')), []);
});
test('reordering is stable, immutable and bounded', () => {
  const initial = normaliseHubLayout();
  const moved = moveHubCard(initial, 'family', -1);
  assert.equal(moved.order[0], 'family');
  assert.equal(initial.order[0], 'funerals');
  assert.deepEqual(moveHubCard(initial, 'funerals', -1), initial);
  assert.deepEqual(moveHubCard(initial, 'unknown', 1), initial);
});
test('image URLs exclude executable, mixed-content and authority-relative values', () => {
  for (const v of [
    'javascript:alert(1)',
    'data:image/svg+xml,a',
    'http://example.org/a.png',
    '//evil.test/a',
    '/\\evil.test/a',
    'https://user:pass@example.org/a',
    '/a\n.png',
    'not a url',
  ])
    assert.equal(safeHubImage(v), '', v);
  assert.equal(safeHubImage('/jic-aerial-sunset.jpg'), '/jic-aerial-sunset.jpg');
  assert.equal(safeHubImage('https://example.org/a.webp'), 'https://example.org/a.webp');
});
test('saved images and quick access flags are normalised deterministically', () => {
  const conf = normaliseHubLayout(
    JSON.stringify({ images: { family: 'javascript:x', hall: '/hall.jpg' }, quickLinks: false }),
  );
  assert.equal(conf.images.family, '');
  assert.equal(conf.images.hall, '/hall.jpg');
  assert.equal(conf.quickLinks, false);
  assert.deepEqual(normaliseHubLayout(JSON.stringify(conf)), conf);
});
