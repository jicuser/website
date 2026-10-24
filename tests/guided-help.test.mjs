import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_JOURNEYS, validateJourney } from '../src/features/guidance/journeys.js';
import { PUBLIC_PAGES } from '../src/content/pageDirectory.js';
import { programmeFeed } from '../src/features/home/programmeFeed.js';
import { compactMenuNavigation } from '../src/lib/publicNavigation.js';
import { PUBLIC_MENU_GROUPS } from '../src/content/nav.js';

const known = new Set([
  ...PUBLIC_PAGES.map((page) => page.path),
  '/portal',
  '/donate',
  '/fundraise/new',
]);
for (const [name, journey] of Object.entries(GUIDED_JOURNEYS)) {
  test(`${name}: every branch terminates with useful guidance and valid destinations`, () => {
    assert.deepEqual(validateJourney(journey), []);
    for (const node of Object.values(journey.nodes)) {
      for (const item of node.links || []) {
        if (item.to.startsWith('/')) assert.ok(known.has(item.to.split(/[?#]/)[0]), item.to);
        else assert.ok(/^https:\/\/|^#/.test(item.to), item.to);
      }
    }
  });
}

test('invalid and cyclic journeys fail validation', () => {
  assert.ok(
    validateJourney({ nodes: { start: { title: 'Broken', choices: [{ next: 'missing' }] } } })
      .length,
  );
  assert.ok(
    validateJourney({ nodes: { start: { title: 'Loop', choices: [{ next: 'start' }] } } }).length,
  );
});

test('public menu has five roots while existing section destinations remain accessible', () => {
  const groups = compactMenuNavigation(PUBLIC_MENU_GROUPS);
  assert.deepEqual(
    groups.map(({ name }) => name),
    ['Home', 'Salah Times', 'Worship', 'Community Hub', 'About JIC'],
  );
  const hub = groups.find(({ path }) => path === '/services');
  for (const path of [
    '/education',
    '/madrassah',
    '/youth',
    '/ramadan',
    '/services/support',
    '/services/skills-careers',
    '/services/marriage-family',
    '/events',
  ]) {
    assert.ok(
      hub.children.some((child) => child.path === path),
      path,
    );
  }
});

test('shared event posters are grouped without dropping recurring dates or unrelated posters', () => {
  const posters = [
    { id: 'a', title: 'Gathering', image: '/a.png' },
    { id: 'b', title: 'Gathering', image: '/b.png' },
  ];
  const events = [
    { id: '1', title: 'Gathering', poster_url: '/a.png', event_date: '2026-10-25' },
    { id: '2', title: 'Gathering', source_poster_id: 'a', event_date: '2026-11-01' },
  ];
  const result = programmeFeed(events, posters);
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.filter((item) => item.isEvent).map((item) => item.event_date),
    ['2026-10-25', '2026-11-01'],
  );
  assert.equal(result[1].image, '/a.png');
  assert.equal(result[2].id, 'poster:b');
  assert.equal(posters.length, 2);
});
