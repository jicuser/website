import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerNavigation, drawerShortcuts, activeDrawerPath } from '../src/lib/drawerNavigation.js';
import { compactMenuNavigation, desktopMenuNavigation } from '../src/lib/publicNavigation.js';
import { visibleNavigation } from '../src/lib/pageVisibility.js';
import { PUBLIC_MENU_GROUPS } from '../src/content/nav.js';
const compact = () => compactMenuNavigation(PUBLIC_MENU_GROUPS);
test('the drawer retains six ordinary roots with classes in the Hub and online reading separate', () => {
  const groups = drawerNavigation(compact());
  assert.deepEqual(groups.map(g => g.path), ['/', '/prayer-times', '/services', '/about', '/donate', '/contact']);
  for (const path of ['/education', '/madrassah', '/funerals', '/services/nikah']) assert.ok(groups.find(g => g.path === '/services').children.some(c => c.path === path));
  assert.ok(!groups.find(g => g.path === '/services').children.some(c => c.path === '/worship'));
  assert.deepEqual(drawerShortcuts(PUBLIC_MENU_GROUPS).map(({ path, name, hint }) => ({ path, name, hint })), [
    { path: '/worship', name: 'Read & Learn', hint: 'Use online' },
    { path: '/education', name: 'Education', hint: 'Classes at JIC' },
  ]);
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
  for (const path of ['/services/nikah/booking', '/madrassah/']) assert.equal(activeDrawerPath(groups, path), '/services');
  assert.equal(activeDrawerPath(groups, '/worship/quran'), undefined);
  assert.equal(activeDrawerPath(groups, '/projects/gallery'), '/about');
  assert.equal(activeDrawerPath(groups, '/contact'), '/contact');
  assert.equal(activeDrawerPath(groups, '/'), '/');
  assert.equal(activeDrawerPath(groups, '/not-a-page'), undefined);
});

test('shortcut highlights follow their visible children, including Arabic outside the worship URL', () => {
  const groups = [...drawerShortcuts(PUBLIC_MENU_GROUPS), ...compact()];
  for (const path of ['/worship', '/worship/quran', '/worship/daily-duas', '/learning/arabic', '/education/arabic/']) {
    assert.equal(activeDrawerPath(groups, path), '/worship', path);
  }
  for (const path of ['/education', '/education/courses', '/madrassah/enrolment']) {
    assert.equal(activeDrawerPath(groups, path), '/education', path);
  }
  assert.equal(activeDrawerPath(groups, '/services/support'), '/services');
  assert.equal(activeDrawerPath(groups, '/learning/arabic-other'), undefined);
});

test('shortcuts use visible sections rather than resurrecting hidden sections from cross-links', () => {
  const get = (key, fallback) => ['page-visibility:/worship', 'page-visibility:/education'].includes(key) ? 'false' : fallback;
  const visible = visibleNavigation(PUBLIC_MENU_GROUPS, get);
  const withCrossLinks = visible.map((group) => group.path === '/services' ? {
    ...group,
    children: [...group.children, { path: '/worship', name: 'Old reading link' }, { path: '/education', name: 'Old classes link' }],
  } : group);
  assert.deepEqual(drawerShortcuts(withCrossLinks), []);
  assert.ok(!desktopMenuNavigation(visible).some((group) => group.path === '/worship'));
});

test('configured shortcut labels and order carry into desktop navigation without mutating menus', () => {
  const settings = {
    labels: { '/worship': 'Online resources', '/education': 'Our classes' },
    order: ['/education', '/worship', '/', '/services'],
    children: { '/worship': ['/learning/arabic', '/worship/quran'] },
  };
  const visible = visibleNavigation(PUBLIC_MENU_GROUPS, (key, fallback) => key === 'site_navigation' ? JSON.stringify(settings) : fallback);
  const before = JSON.stringify(visible);
  assert.deepEqual(drawerShortcuts(visible).map((group) => group.name), ['Our classes', 'Online resources']);
  const desktop = desktopMenuNavigation(visible);
  assert.deepEqual(desktop.slice(0, 3).map((group) => group.path), ['/worship', '/', '/services']);
  const reading = desktop.find((group) => group.path === '/worship');
  assert.equal(reading.name, 'Online resources');
  assert.deepEqual(reading.children.slice(0, 2).map((page) => page.path), ['/learning/arabic', '/worship/quran']);
  assert.deepEqual(reading.sectionPaths, ['/worship']);
  assert.equal(JSON.stringify(visible), before);
});

test('hidden reading children stay hidden and explicitly moved Arabic follows its configured section', () => {
  const visible = visibleNavigation(PUBLIC_MENU_GROUPS, (key, fallback) => {
    if (key === 'page-visibility:/worship/quran') return 'false';
    if (key === 'page-section:/learning/arabic') return '/education';
    return fallback;
  });
  const shortcuts = drawerShortcuts(visible);
  assert.ok(!shortcuts.find((group) => group.path === '/worship').children.some((page) => page.path === '/worship/quran'));
  assert.equal(activeDrawerPath([...shortcuts, ...compactMenuNavigation(visible)], '/learning/arabic'), '/education');
});
