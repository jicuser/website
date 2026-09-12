import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPages, SEARCH_PAGES } from '../src/lib/siteSearch.js';

test('public search finds local terms, multiword pages and social channels', () => {
  assert.ok(searchPages('salah').some((item) => item.path === '/prayer-times'));
  assert.ok(searchPages('friday khutbah').some((item) => item.path === '/prayer-times/jummah'));
  assert.ok(searchPages('instagram').some((item) => item.path === '/social-media#instagram'));
  assert.deepEqual(searchPages('  '), []);
  assert.equal(new Set(SEARCH_PAGES.map((item) => item.path)).size, SEARCH_PAGES.length);
  assert.ok(SEARCH_PAGES.every((item) => !/^\/(admin|tv)/.test(item.path)));
});
test('hostile search strings are treated literally, with no dynamic query execution', () => {
  for (const query of ["' OR 1=1 --", '<script>alert(1)</script>', '.*', 'a'.repeat(10000)]) {
    assert.deepEqual(searchPages(query), []);
  }
  const entries = [{ path: '/about', title: 'Café community', section: 'About' }];
  assert.equal(searchPages('cafe', entries)[0].path, '/about');
});
