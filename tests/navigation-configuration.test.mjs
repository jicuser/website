import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredNavigation, visibleNavigation } from '../src/lib/pageVisibility.js';
import { compactMenuNavigation } from '../src/lib/publicNavigation.js';
import { PUBLIC_MENU_GROUPS } from '../src/content/nav.js';
import {
  NAVIGATION_CONTENT_KEY,
  readNavigationConfiguration,
} from '../src/lib/navigationConfiguration.js';

test('saved labels/order apply to the complete menu without changing destinations', () => {
  const config = {
    labels: { '/education': 'Learning together', '/contact': 'Contact the office' },
    order: ['/ramadan', '/', '/education'],
    children: { '/about': ['/contact', '/about'] },
  };
  const get = (key, fallback) =>
    key === NAVIGATION_CONTENT_KEY ? JSON.stringify(config) : fallback;
  const groups = compactMenuNavigation(configuredNavigation(PUBLIC_MENU_GROUPS, get));
  assert.deepEqual(
    groups.slice(0, 3).map((group) => group.path),
    ['/ramadan', '/', '/education'],
  );
  assert.equal(groups.find((group) => group.path === '/education').name, 'Learning together');
  const about = groups.find((group) => group.path === '/about');
  assert.equal(about.children[0].name, 'Contact the office');
  assert.equal(about.children[0].path, '/contact');
  assert.equal(about.children[1].name, 'About JIC');
  assert.equal(
    PUBLIC_MENU_GROUPS.find((group) => group.path === '/about').children[0].path,
    '/about',
  );
  assert.equal(
    groups.flatMap((group) => group.children).some((child) => /\boverview\b/i.test(child.name)),
    false,
    'section choices describe their purpose without generic overview links',
  );
});

test('published added pages join the selected menu and respect visibility', () => {
  const added = [{ slug: 'new-class', title: 'New class', placement: '/education/courses' }];
  const get = (key, fallback) => (key === 'page-visibility:/pages/new-class' ? 'false' : fallback);
  assert.equal(
    configuredNavigation(PUBLIC_MENU_GROUPS, get, added)
      .find((group) => group.path === '/education')
      .children.some((child) => child.path === '/pages/new-class'),
    true,
  );
  assert.equal(
    visibleNavigation(PUBLIC_MENU_GROUPS, get, added)
      .find((group) => group.path === '/education')
      .children.some((child) => child.path === '/pages/new-class'),
    false,
  );
});

test('corrupt navigation settings cannot remove the built-in menu or add unsafe addresses', () => {
  for (const value of ['{invalid', 'null', '[]'])
    assert.deepEqual(readNavigationConfiguration(value), { labels: {}, order: [], children: {} });
  const config = readNavigationConfiguration({
    labels: { '//evil.test': 'Bad', '/contact': ' Office ' },
    order: ['/contact', '/contact', 'https://evil.test'],
  });
  assert.deepEqual(config.labels, { '/contact': 'Office' });
  assert.deepEqual(config.order, ['/contact']);
});
