import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_PAGES, pageName } from '../src/content/pageDirectory.js';
import { NAV_GROUPS, MADRASSAH_TABS, MASJID_EXTENSION_TABS } from '../src/content/nav.js';
import {
  EDITABLE_PAGES,
  supplementalContentPaths,
  pageDefaults,
} from '../src/content/editablePages.js';
import { standaloneSections } from '../src/content/sectionRoutes.js';
import { SEARCH_PAGES } from '../src/lib/siteSearch.js';
import { ADMIN_SECTIONS, ADMIN_GROUPS } from '../src/content/adminNavigation.js';
import { PAGE_PLACEMENTS } from '../src/lib/pageContent.js';

test('overview links cannot replace full page names in the editor and search', () => {
  for (const group of NAV_GROUPS) {
    assert.equal(pageName(group.path), group.name, group.path);
    assert.equal(SEARCH_PAGES.find((page) => page.path === group.path)?.title, group.name);
  }
  assert.equal(new Set(PUBLIC_PAGES.map((page) => page.path)).size, PUBLIC_PAGES.length);
  assert.ok(
    PUBLIC_PAGES.every(
      (page) => page.name && page.name !== 'Overview' && !page.name.startsWith('‹'),
    ),
  );
});

test('every nested Madrassah and extension destination is available to editors', () => {
  for (const { path } of [...MADRASSAH_TABS, ...MASJID_EXTENSION_TABS]) {
    assert.ok(
      EDITABLE_PAGES.some((page) => page.path === path),
      path,
    );
    assert.ok(
      SEARCH_PAGES.some((page) => page.path === path),
      path,
    );
  }
});

test('each editable page has one content location and additional content starts empty', () => {
  const main = new Set(standaloneSections.map(([path]) => `/${path}`));
  for (const page of EDITABLE_PAGES) {
    const owners =
      Number(page.path === '/') +
      Number(main.has(page.path)) +
      Number(supplementalContentPaths.has(page.path));
    assert.equal(owners, 1, page.path);
    if (supplementalContentPaths.has(page.path)) assert.equal(pageDefaults(page).title, '');
  }
});

test('programme placement labels use the same destination names as navigation', () => {
  for (const [path, label] of PAGE_PLACEMENTS) assert.equal(label, pageName(path), path);
});

test('staff tasks retain unique destinations and permission requirements', () => {
  assert.equal(new Set(ADMIN_SECTIONS.map((section) => section.id)).size, ADMIN_SECTIONS.length);
  assert.equal(new Set(ADMIN_SECTIONS.map((section) => section.name)).size, ADMIN_SECTIONS.length);
  for (const section of ADMIN_SECTIONS) {
    assert.ok(section.permission, section.id);
    assert.ok(ADMIN_GROUPS.includes(section.group), section.id);
    if (section.id !== 'dashboard') assert.ok(section.description, section.id);
  }
  assert.equal(ADMIN_SECTIONS.find((section) => section.id === 'forms').permission, 'forms');
  assert.equal(
    ADMIN_SECTIONS.some((section) => section.id === 'messages'),
    false,
  );
  assert.equal(ADMIN_SECTIONS.find((section) => section.id === 'users').permission, 'users');
});
