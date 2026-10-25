import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerNavigation, activeDrawerPath } from '../src/lib/drawerNavigation.js';
import { compactMenuNavigation } from '../src/lib/publicNavigation.js';
import { PUBLIC_MENU_GROUPS } from '../src/content/nav.js';
const compact = () => compactMenuNavigation(PUBLIC_MENU_GROUPS);
test('mobile and desktop share six roots, with worship and learning inside the Hub', () => {
  const groups = drawerNavigation(compact());
  assert.deepEqual(groups.map(g => g.path), ['/', '/prayer-times', '/services', '/about', '/donate', '/contact']);
  for (const path of ['/worship', '/education', '/madrassah', '/funerals', '/services/nikah']) assert.ok(groups.find(g => g.path === '/services').children.some(c => c.path === path));
});
test('hidden menu destinations are not invented or promoted', () => {
  const hidden = PUBLIC_MENU_GROUPS.filter(g => !['/education', '/projects', '/donate'].includes(g.path)).map(g => ({ ...g, children: g.children.filter(c => !['/funerals', '/contact', '/donate'].includes(c.path)) }));
  const groups = drawerNavigation(compactMenuNavigation(hidden));
  for (const path of ['/funerals', '/contact', '/education', '/projects', '/donate']) assert.ok(!groups.flatMap(g => [g, ...g.children]).some(g => g.path === path));
});
test('drawer preserves configured labels and root order without mutating its input', () => {
  const input = compact().reverse().map(g => g.path === '/about' ? { ...g, name: 'Our centre' } : g);
  const before = JSON.stringify(input);
  assert.deepEqual(drawerNavigation(input), input);
  assert.equal(JSON.stringify(input), before);
});
test('drawer deduplicates roots and handles an empty menu', () => {
  const groups = compact();
  assert.equal(drawerNavigation([...groups, groups[0]]).length, groups.length);
  assert.deepEqual(drawerNavigation([]), []);
});
test('merged destinations retain the correct primary highlight', () => {
  const groups = compact();
  for (const path of ['/services/nikah/booking', '/madrassah/', '/worship/quran']) assert.equal(activeDrawerPath(groups, path), '/services');
  assert.equal(activeDrawerPath(groups, '/projects/gallery'), '/about');
  assert.equal(activeDrawerPath(groups, '/contact'), '/contact');
  assert.equal(activeDrawerPath(groups, '/'), '/');
  assert.equal(activeDrawerPath(groups, '/not-a-page'), undefined);
});
