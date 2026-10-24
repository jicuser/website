import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_HELP } from '../src/content/guidedHelp.js';
import { guidedHelpProblem, advanceGuidance, readGuidedHelp } from '../src/lib/guidedHelp.js';
import { normaliseSiteDesign, designForPage } from '../src/lib/siteDesign.js';
import { homeWhatsOn } from '../src/lib/whatsOn.js';
import { COMMUNITY_SERVICES } from '../src/content/communityServices.js';
import { PUBLIC_MENU_GROUPS } from '../src/content/nav.js';
import { compactMenuNavigation } from '../src/lib/publicNavigation.js';
import { isPageVisible } from '../src/lib/pageVisibility.js';
import { searchPages } from '../src/lib/siteSearch.js';

test('all published branches terminate with useful results', () => {
  for (const guide of Object.values(GUIDED_HELP)) assert.equal(guidedHelpProblem(guide), '');
});
test('broken, looping and unreachable branches are rejected and fall back safely', () => {
  const base = GUIDED_HELP['/services/skills-careers'];
  for (const alter of [
    (g) => {
      g.questions[0].choices[0].next = 'missing';
    },
    (g) => {
      g.questions[1].choices[0].next = 'task';
    },
    (g) => {
      g.results.push({ id: 'orphan', title: 'Orphan', body: 'Text', steps: [], resources: [] });
    },
    (g) => {
      g.results[0].resources = ['https://untrusted.invalid'];
    },
  ]) {
    const invalid = structuredClone(base);
    alter(invalid);
    assert.ok(guidedHelpProblem(invalid));
    assert.equal(readGuidedHelp(invalid, base), base);
  }
});
test('backtracking and choosing a different answer removes the earlier branch', () => {
  const guide = GUIDED_HELP['/services/skills-careers'];
  let trail = advanceGuidance(guide, [], 'cv-stage');
  trail = advanceGuidance(guide, trail, 'first-cv');
  assert.equal(trail.at(-1).next, 'first-cv');
  trail = advanceGuidance(guide, trail.slice(0, -2), 'interview');
  assert.deepEqual(trail, [{ question: 'task', choice: 'interview', next: 'interview' }]);
});
test('appearance overrides are scoped and reject arbitrary CSS, icons and routes', () => {
  const design = normaliseSiteDesign({
    palette: 'forest',
    layout: 'compact',
    pages: { '/services': { palette: 'slate', layout: 'list' }, '/tv': { palette: 'forest' } },
    icons: { hall: 'heart', support: 'script' },
    css: 'body{}',
  });
  assert.deepEqual(designForPage(design, '/services'), { palette: 'slate', layout: 'list' });
  assert.deepEqual(designForPage(design, '/worship'), { palette: 'forest', layout: 'compact' });
  assert.equal(design.pages['/tv'], undefined);
  assert.equal(design.icons.support, undefined);
  assert.equal(design.css, undefined);
});
test('Home merges only matching events and posters, bounded to three rows', () => {
  const events = [
    { id: 1, title: 'Talk', poster_url: '/a.jpg' },
    { id: 2, title: 'Talk', poster_url: '/b.jpg' },
  ];
  const posters = [
    { id: 'a', title: 'Talk', image: '/a.jpg', to: '/pages/talk' },
    { id: 'c', title: 'Talk', image: '/c.jpg' },
    { id: 'd', title: 'Other', image: '/d.jpg' },
  ];
  const rows = homeWhatsOn(events, posters);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].programmeTo, '/pages/talk');
  assert.equal(rows[2].id, 'c');
  assert.equal(events[0].programmeTo, undefined);
});
test('the five primary groups retain eight direct Hub destinations and search aliases', () => {
  assert.deepEqual(
    compactMenuNavigation(PUBLIC_MENU_GROUPS).map((g) => g.path),
    ['/', '/prayer-times', '/worship', '/services', '/about'],
  );
  assert.equal(COMMUNITY_SERVICES.length, 8);
  const hub = compactMenuNavigation(PUBLIC_MENU_GROUPS).find((g) => g.path === '/services');
  for (const service of COMMUNITY_SERVICES)
    assert.ok(hub.children.some((p) => p.path === service.to));
  for (const [query, path] of [
    ['nikkah', '/services/nikah'],
    ['azkar', '/worship/daily-duas'],
    ['cv', '/services/skills-careers'],
  ])
    assert.ok(searchPages(query).some((p) => p.path === path));
  assert.equal(
    isPageVisible(() => 'false', '/services/support'),
    true,
  );
});

test('malformed saved guidance falls back without throwing', () => {
  const fallback = GUIDED_HELP['/education'];
  for (const value of [
    { questions: [null], results: [] },
    { questions: [], results: [null] },
    { ...fallback, enabled: 'false' },
    { ...fallback, results: [{ ...fallback.results[0], resources: ['toString'] }] },
  ])
    assert.equal(readGuidedHelp(value, fallback), fallback);
});
