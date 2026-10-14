import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { PAGE_ALIASES, canonicalPagePath } from '../src/content/pageAliases.js';
import { EDITABLE_PAGES, editablePagePath, pageKey } from '../src/content/editablePages.js';
import { SEARCH_PAGES } from '../src/lib/siteSearch.js';
import { standaloneSections } from '../src/content/sectionRoutes.js';

test('legacy project links share the canonical content and editor destination', () => {
  for (const [alias, canonical] of Object.entries(PAGE_ALIASES)) {
    assert.equal(canonicalPagePath(alias), canonical);
    assert.equal(canonicalPagePath(`${alias}/`), canonical);
    assert.equal(pageKey(alias), pageKey(canonical));
    assert.equal(editablePagePath(alias), canonical);
    assert.equal(editablePagePath(`${alias}/`), canonical);
    assert.equal(EDITABLE_PAGES.filter((page) => page.path === canonical).length, 1);
    assert.ok(EDITABLE_PAGES.every((page) => page.path !== alias));
    assert.ok(SEARCH_PAGES.every((page) => page.path !== alias));
    assert.ok(standaloneSections.every(([path]) => `/${path}` !== alias));
  }
  assert.equal(canonicalPagePath('/projects/timeline-extra'), '/projects/timeline-extra');
  assert.equal(editablePagePath('/unknown-page'), '/');
  assert.equal(editablePagePath('/education'), '/education');
});

const bundled = await build({
  entryPoints: [
    new URL('../src/components/shell/CanonicalPageRedirect.jsx', import.meta.url).pathname,
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  alias: { '@': new URL('../src', import.meta.url).pathname },
});

test('legacy redirects replace history without dropping query, anchor or navigation state', () => {
  const require = createRequire(import.meta.url);
  for (const [alias, canonical] of Object.entries(PAGE_ALIASES)) {
    const location = {
      pathname: alias,
      search: '?from=menu&preview=true',
      hash: '#progress',
      state: { returnTo: '/projects' },
    };
    function Navigate() {}
    const context = {
      module: { exports: {} },
      require: (name) =>
        name === 'react-router-dom' ? { Navigate, useLocation: () => location } : require(name),
    };
    runInNewContext(bundled.outputFiles[0].text, context);
    const redirect = context.module.exports.default();
    assert.equal(redirect.type, Navigate);
    assert.equal(redirect.props.to.pathname, canonical);
    assert.equal(redirect.props.to.search, location.search);
    assert.equal(redirect.props.to.hash, location.hash);
    assert.equal(redirect.props.state, location.state);
    assert.equal(redirect.props.replace, true);
  }
});
