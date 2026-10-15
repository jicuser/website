import test from 'node:test';
import assert from 'node:assert/strict';
import { isPageVisible, pageVisibilityKey, visibleNavigation } from '../src/lib/pageVisibility.js';

test('visibility is shared across aliases, query strings and trailing slashes', () => {
  const hidden = pageVisibilityKey('/projects/masjid-extension/timeline');
  const get = (key, fallback) => (key === hidden ? 'false' : fallback);
  assert.equal(isPageVisible(get, '/projects/timeline?preview=1'), false);
  assert.equal(isPageVisible(get, '/projects/masjid-extension/timeline/'), false);
  assert.equal(isPageVisible(get, '/services'), true);
});
test('essential pages cannot be hidden and child switches do not hide siblings', () => {
  const get = (key, fallback) =>
    ['page-visibility:/', 'page-visibility:/privacy', 'page-visibility:/services/nikah'].includes(
      key,
    )
      ? 'false'
      : fallback;
  assert.equal(isPageVisible(get, '/'), true);
  assert.equal(isPageVisible(get, '/privacy'), true);
  const groups = [
    {
      name: 'Services',
      path: '/services',
      children: [{ path: '/services/nikah' }, { path: '/services/hall-booking' }],
    },
  ];
  assert.deepEqual(visibleNavigation(groups, get)[0].children, [
    { path: '/services/hall-booking' },
  ]);
  assert.equal(groups[0].children.length, 2);
});

test('moving a page changes its menu group without changing its address', async () => {
  const { configuredNavigation, pageSectionKey } = await import('../src/lib/pageVisibility.js');
  const groups = [
    { path: '/about', children: [{ name: 'Contact', path: '/contact' }] },
    { path: '/services', children: [] },
  ];
  const configured = configuredNavigation(groups, (key, fallback) =>
    key === pageSectionKey('/contact') ? '/services' : fallback,
  );
  assert.equal(configured[0].children.length, 0);
  assert.equal(configured[1].children.filter((page) => page.path === '/contact').length, 1);
  assert.equal(groups[0].children.length, 1);
  assert.deepEqual(
    configuredNavigation(groups, (key, fallback) =>
      key === pageSectionKey('/contact') ? '/unknown' : fallback,
    ),
    groups,
  );
});
