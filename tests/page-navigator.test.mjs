import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { EDITABLE_PAGES } from '../src/content/editablePages.js';
import { PUBLIC_MENU_GROUPS } from '../src/content/nav.js';
import { buildPageNavigator, findNavigatorPages } from '../src/lib/pageNavigator.js';

const sections = buildPageNavigator(EDITABLE_PAGES);
const expectedSections = [
  'Home',
  'About',
  'Prayer Times',
  'Faith & practice',
  'Services',
  'Our Masjid Project',
  'Education',
  'Youth',
  'Madrassah',
  'Giving',
  'Get involved',
  'Social Media',
];

test('page navigator keeps each canonical page once within the public website hierarchy', () => {
  assert.deepEqual(
    sections.map((section) => section.name),
    expectedSections,
  );
  const pages = sections.flatMap((section) => section.pages);
  assert.equal(pages.length, EDITABLE_PAGES.length);
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
  for (const page of EDITABLE_PAGES) {
    assert.equal(pages.find((item) => item.path === page.path).name, page.name);
  }
});

test('Portal stays visible in the menu without making private records CMS-editable', () => {
  assert.equal(PUBLIC_MENU_GROUPS.find((group) => group.path === '/portal')?.name, 'Portal login');
  assert.equal(PUBLIC_MENU_GROUPS.find((group) => group.path === '/portal')?.editable, false);
  assert.equal(
    sections.some((section) => section.path === '/portal'),
    false,
  );
  assert.equal(
    EDITABLE_PAGES.some((page) => page.path === '/portal'),
    false,
  );
});

test('the public donation page remains editable without adding private menu destinations', () => {
  const pages = sections.flatMap((section) => section.pages);
  assert.deepEqual(
    sections.find((section) => section.path === '/donate').pages.map((page) => page.path),
    ['/donate'],
  );
  for (const path of [
    '/portal',
    '/account/invoices',
    '/account/certificates',
    '/account/request',
    '/account/recovery',
    '/fundraise/new',
    '/admin',
    '/admin/setup',
  ]) {
    assert.equal(
      EDITABLE_PAGES.some((page) => page.path === path),
      false,
      path,
    );
    assert.equal(
      pages.some((page) => page.path === path),
      false,
      path,
    );
  }
});

test('nested pages retain clear names inside Education, Services and Our Masjid Project', () => {
  const find = (path) =>
    sections.flatMap((section) => section.pages).find((page) => page.path === path);
  assert.equal(find('/madrassah').section, 'Madrassah');
  assert.equal(find('/madrassah/policies').section, 'Madrassah');
  assert.equal(find('/madrassah/policies').label, 'Policies');
  assert.equal(find('/projects/masjid-extension/timeline').section, 'Our Masjid Project');
  assert.equal(find('/projects/masjid-extension/timeline').label, 'Extension Timeline');
  assert.equal(find('/projects/main-prayer-hall').label, 'Main Prayer Hall');
  assert.equal(find('/funerals/contact-support').section, 'Services');
  assert.equal(find('/contact').section, 'About');
  assert.equal(find('/social-media').section, 'Social Media');
});

test('page search spans sections, tolerates whitespace and finds URL or name', () => {
  assert.deepEqual(
    findNavigatorPages(sections, '  MADRASSAH   policies ').map((page) => page.path),
    ['/madrassah/policies'],
  );
  assert.deepEqual(
    findNavigatorPages(sections, '/prayer-times/monthly').map((page) => page.path),
    ['/prayer-times/monthly'],
  );
  assert.ok(findNavigatorPages(sections, "qur'an").some((page) => page.path === '/worship/quran'));
  assert.equal(findNavigatorPages(sections, 'no such destination').length, 0);
});

const bundled = await build({
  entryPoints: [new URL('../src/components/admin/PageNavigator.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  loader: { '.css': 'empty' },
  alias: { '@': new URL('../src', import.meta.url).pathname },
});
const require = createRequire(import.meta.url);
function harness(props) {
  const state = [];
  let index = 0;
  const context = {
    module: { exports: {} },
    require: (name) =>
      name === 'react'
        ? {
            ...React,
            useId: () => 'page-test',
            useEffect: () => {},
            useState: (initial) => {
              const key = index++;
              if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial;
              return [
                state[key],
                (value) => {
                  state[key] = typeof value === 'function' ? value(state[key]) : value;
                },
              ];
            },
          }
        : require(name),
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  return () => {
    index = 0;
    return context.module.exports.default(props);
  };
}
function nodes(tree, match) {
  if (!tree || typeof tree !== 'object') return [];
  const children = React.Children.toArray(tree.props?.children);
  return [...(match(tree) ? [tree] : []), ...children.flatMap((child) => nodes(child, match))];
}
const input = (tree, suffix) => nodes(tree, (node) => node.props?.id === `page-test-${suffix}`)[0];
const section = (tree, name) => nodes(tree, (node) => node.props?.['data-section'] === name)[0];
const page = (tree, path) => nodes(tree, (node) => node.props?.['data-page-path'] === path)[0];

test('browsing a section does not navigate or discard the currently edited page', () => {
  const calls = [];
  const render = harness({
    selected: '/madrassah/policies',
    onSelectPage: (path) => calls.push(path),
  });
  let tree = render();
  assert.equal(section(tree, 'Madrassah').props['aria-expanded'], true);
  assert.equal(page(tree, '/madrassah/policies').props['aria-current'], 'page');
  assert.equal(nodes(tree, (node) => node.props?.['aria-current'] === 'page').length, 1);
  section(tree, 'Services').props.onClick();
  tree = render();
  assert.deepEqual(calls, []);
  assert.equal(section(tree, 'Services').props['aria-expanded'], true);
  assert.equal(section(tree, 'Madrassah').props['aria-expanded'], false);
  assert.ok(
    nodes(tree, (node) => node.type === 'strong').some(
      (node) => node.props.children === 'Madrassah',
    ),
  );
});

test('opening a page delegates to the parent guard and never updates selected optimistically', () => {
  const calls = [];
  const render = harness({ selected: '/education', onSelectPage: (path) => calls.push(path) });
  let tree = render();
  page(tree, '/education/courses').props.onClick();
  assert.deepEqual(calls, ['/education/courses']);
  tree = render();
  assert.equal(page(tree, '/education').props['aria-current'], 'page');
  page(tree, '/education').props.onClick();
  assert.deepEqual(calls, ['/education/courses']);
});

test('search finds other sections without opening anything and offers an empty result state', () => {
  const calls = [];
  const render = harness({ selected: '/education', onSelectPage: (path) => calls.push(path) });
  input(render(), 'search').props.onChange({ target: { value: 'Janazah' } });
  let tree = render();
  const results = nodes(
    tree,
    (node) => node.type === 'nav' && node.props['aria-label'] === 'Page search results',
  )[0];
  const buttons = nodes(results, (node) => node.type === 'button');
  assert.equal(buttons.length, 1);
  assert.deepEqual(calls, []);
  buttons[0].props.onClick();
  assert.deepEqual(calls, ['/worship/janazah-guide']);
  input(tree, 'search').props.onChange({ target: { value: 'no such destination' } });
  tree = render();
  assert.ok(
    nodes(tree, (node) => node.type === 'p').some(
      (node) => node.props.children === 'No matching pages. Try a different name.',
    ),
  );
});

test('saving disables navigation and guards against a programmatic page selection', () => {
  const calls = [];
  const render = harness({
    selected: '/education',
    disabled: true,
    onSelectPage: (path) => calls.push(path),
  });
  const tree = render();
  for (const node of nodes(tree, (node) => ['input', 'select', 'button'].includes(node.type)))
    assert.equal(node.props.disabled, true);
  page(tree, '/education/courses').props.onClick();
  section(tree, 'Services').props.onClick();
  assert.deepEqual(calls, []);
});

test('page editor sections follow the public menu order and Home is a direct destination', () => {
  const calls = [];
  const render = harness({ selected: '/education', onSelectPage: (path) => calls.push(path) });
  const tree = render();
  assert.deepEqual(
    nodes(tree, (node) => Boolean(node.props?.['data-section'])).map(
      (node) => node.props['data-section'],
    ),
    expectedSections,
  );
  assert.equal(section(tree, 'Home').props['aria-expanded'], undefined);
  section(tree, 'Home').props.onClick();
  assert.deepEqual(calls, ['/']);
});

test('page viewing uses a separate saved-website link without changing the editor', () => {
  const calls = [];
  const render = harness({ selected: '/education', onSelectPage: (path) => calls.push(path) });
  const link = nodes(
    render(),
    (node) => node.type === 'a' && node.props.href === '/education/courses',
  )[0];
  assert.equal(link.props.target, '_blank');
  assert.equal(link.props.rel, 'noreferrer');
  assert.equal(link.props['aria-label'], 'View Adult Classes website page');
  assert.deepEqual(calls, []);
});
