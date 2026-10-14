import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import React from 'react';

const require = createRequire(import.meta.url);
const sources = {};
for (const name of ['ContentPages', 'ContentPageEditor', 'PosterWorkflow']) {
  const result = await build({
    entryPoints: [new URL(`../src/features/content/${name}.jsx`, import.meta.url).pathname],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    alias: { '@': new URL('../src', import.meta.url).pathname },
    plugins: [
      {
        name: 'programme-page-fixture',
        setup(builder) {
          builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({ path, namespace: 'empty' }));
          builder.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }));
          const modules = {
            '@/lib/supabaseClient': 'export const supabase = globalThis.fixture.supabase;',
            '@/context/AuthContext':
              'export const useAuth = () => ({can: globalThis.fixture.can});',
            '@/context/AdminSaveContext':
              'export const useAdminSave = () => ({dirty:globalThis.fixture.adminDirty || false,saving:globalThis.fixture.adminSaving || false}); export const useRegisterAdminSave = (save,dirty,label,busy) => {globalThis.fixture.save = save; globalThis.fixture.dirty = dirty; globalThis.fixture.busy = busy;};',
            '@/hooks/useAdminRecords':
              'export default () => ({data:globalThis.fixture.pages,loading:false,error:null,reload:()=>{}});',
            '@/components/workspace/shared':
              'export const checked = async value => { const result = await value; if(result?.error) throw result.error; return result?.data; };',
            '@/components/admin/PageEditor': 'export default function PageEditor(){return null;}',
            '@/components/workspace/CustomFormsBuilder':
              'export default function CustomFormsBuilder(){return null;}',
            '@/lib/images': 'export const IMAGE_ACCEPT = "image/*";',
            '@/lib/imageUpload':
              'export const createImageUploader = () => async () => "/image.jpg";',
          };
          builder.onResolve({ filter: /^@\// }, ({ path }) =>
            modules[path] ? { path, namespace: 'fixture' } : null,
          );
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents: modules[path],
          }));
        },
      },
    ],
  });
  sources[name] = result.outputFiles[0].text;
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  return textOf(tree.props?.children);
}
function control(tree, label, type) {
  const field = nodes(tree).find((node) => node.type === 'label' && textOf(node).startsWith(label));
  assert.ok(field, label);
  return nodes(field).find((node) => node.type === type);
}
function button(tree, label) {
  const found = nodes(tree).find((node) => node.type === 'button' && textOf(node) === label);
  assert.ok(found, label);
  return found;
}
const existing = {
  id: 'page-1',
  title: 'Adult course',
  slug: 'adult-course',
  body: '',
  image_url: '',
  schedule: '',
  placement: '/education',
  kind: 'course',
  registration: 'interest',
  form_id: 'form-1',
  published: false,
  updated_at: '2026-10-14T10:00:00Z',
};

function fixture(name, props = {}, overrides = {}) {
  const states = [];
  let cursor = 0;
  const calls = [];
  const data = {
    can: () => true,
    pages: [],
    confirmed: true,
    confirms: [],
    supabase: {
      rpc: async (rpc, payload) => {
        calls.push({ rpc, payload });
        return { data: { ...payload.p_page, updated_at: '2026-10-14T11:00:00Z' } };
      },
    },
    ...overrides,
  };
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [
        states[index],
        (value) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      states[index] ||= { current: initial };
      return states[index];
    },
    useCallback: (callback) => callback,
    useEffect() {},
  };
  const context = {
    module: { exports: {} },
    fixture: data,
    crypto: { randomUUID: () => 'new-page' },
    Event: class Event {},
    window: {
      confirm: (message) => {
        data.confirms.push(message);
        return data.confirmed;
      },
      dispatchEvent() {},
    },
    require: (module) =>
      module === 'react'
        ? hooks
        : module === 'react-router-dom'
          ? { Link: 'a', useSearchParams: () => [new URLSearchParams(), () => {}] }
          : require(module),
  };
  runInNewContext(sources[name], context);
  const Component =
    name === 'ContentPages'
      ? context.module.exports.ContentPageCatalogue
      : context.module.exports.default;
  return {
    data,
    calls,
    render() {
      cursor = 0;
      return Component(props);
    },
  };
}

test('programme catalogue combines website section, visibility and case-insensitive search', () => {
  const view = fixture(
    'ContentPages',
    {},
    {
      pages: [
        { ...existing, title: 'Adult course', published: true },
        { ...existing, id: 'page-2', title: 'Youth club', placement: '/youth' },
        { ...existing, id: 'page-3', title: 'Evening course', published: true },
      ],
    },
  );
  control(view.render(), 'Website section', 'select').props.onChange({
    target: { value: '/education' },
  });
  control(view.render(), 'Visibility', 'select').props.onChange({ target: { value: 'live' } });
  control(view.render(), 'Search pages', 'input').props.onChange({
    target: { value: '  EVENING  ' },
  });
  let tree = view.render();
  assert.deepEqual(
    nodes(tree)
      .filter((node) => node.type === 'h3')
      .map(textOf),
    ['Evening course'],
  );
  assert.match(textOf(tree), /1 page shown/);
  button(tree, 'Clear filters').props.onClick();
  tree = view.render();
  assert.equal(nodes(tree).filter((node) => node.type === 'h3').length, 3);
});

test('new programme pages inherit the chosen website section and form shortcuts respect permission', () => {
  const view = fixture('ContentPages', {}, { can: () => false, pages: [existing] });
  assert.ok(!nodes(view.render()).some((node) => node.type === 'a' && /forms/.test(node.props.to)));
  control(view.render(), 'Website section', 'select').props.onChange({
    target: { value: '/youth' },
  });
  button(view.render(), 'Create page').props.onClick();
  assert.equal(view.render().props.initialPlacement, '/youth');
  assert.equal(view.render().props.page, null);
});

test('programme section and visibility changes remain drafts until the checked save RPC succeeds', async () => {
  const view = fixture('ContentPageEditor', { page: existing });
  control(view.render(), 'Website section', 'select').props.onChange({
    target: { value: '/youth' },
  });
  control(view.render(), 'Show page on website', 'input').props.onChange({
    target: { checked: true },
  });
  let tree = view.render();
  assert.equal(view.calls.length, 0);
  assert.equal(view.data.dirty, true);
  assert.ok(!nodes(tree).some((node) => node.type === 'a' && /View saved/.test(textOf(node))));
  await button(tree, 'Save page changes').props.onClick();
  assert.equal(view.calls[0].rpc, 'save_site_page');
  assert.equal(view.calls[0].payload.p_page.placement, '/youth');
  assert.equal(view.calls[0].payload.p_page.slug, existing.slug);
  assert.equal(view.calls[0].payload.p_page.form_id, existing.form_id);
  assert.equal(view.calls[0].payload.p_page.expected_updated_at, existing.updated_at);
  tree = view.render();
  assert.equal(view.data.dirty, false);
  assert.ok(
    nodes(tree).some((node) => node.type === 'a' && textOf(node) === 'View saved website page'),
  );
});

test('a new programme page uses a valid selected section and stays hidden by default', () => {
  const view = fixture('ContentPageEditor', { initialPlacement: '/youth' });
  const tree = view.render();
  assert.equal(control(tree, 'Website section', 'select').props.value, '/youth');
  assert.equal(control(tree, 'Show page on website', 'input').props.checked, false);
  assert.equal(view.calls.length, 0);
  const invalid = fixture('ContentPageEditor', { initialPlacement: '/admin' });
  assert.equal(control(invalid.render(), 'Website section', 'select').props.value, '/education');
});

test('cancelled hide keeps the draft and does not write; failed save also keeps edits', async () => {
  const view = fixture(
    'ContentPageEditor',
    { page: { ...existing, published: true } },
    { confirmed: false },
  );
  control(view.render(), 'Show page on website', 'input').props.onChange({
    target: { checked: false },
  });
  view.render();
  assert.equal(await view.data.save(), false);
  assert.equal(view.calls.length, 0);
  assert.equal(view.data.dirty, true);
  assert.ok(
    nodes(view.render()).some(
      (node) => node.type === 'a' && textOf(node) === 'View saved website page',
    ),
  );
  view.data.confirmed = true;
  view.data.supabase.rpc = async () => ({ error: new Error('Another editor changed this page.') });
  await assert.rejects(view.data.save, /Another editor/);
  assert.match(textOf(view.render()), /Another editor changed this page/);
  assert.equal(view.data.dirty, true);
});

test('opening a linked form protects unsaved page edits and form creation requires permission', () => {
  const view = fixture(
    'ContentPageEditor',
    { page: existing },
    { confirmed: false, can: (permission) => permission === 'forms' },
  );
  let tree = view.render();
  assert.ok(
    !nodes(tree).some((node) => node.type === 'button' && /Create new form/.test(textOf(node))),
  );
  control(tree, 'Page title', 'input').props.onChange({ target: { value: 'Changed title' } });
  tree = view.render();
  const link = nodes(tree).find(
    (node) => node.type === 'a' && textOf(node) === 'Open form & responses',
  );
  let prevented = false;
  link.props.onClick({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(view.data.confirms.length, 1);
});

test('poster form shortcuts protect nested page drafts and prevent leaving during a save', () => {
  const view = fixture(
    'PosterWorkflow',
    { poster: { id: 'poster-1', title: 'Course poster' } },
    {
      pages: [existing],
      adminDirty: true,
      confirmed: false,
    },
  );
  const links = nodes(view.render()).filter(
    (node) => node.type === 'a' && node.props.to.includes('section=forms'),
  );
  assert.equal(links.length, 2);
  for (const link of links) {
    let prevented = false;
    link.props.onClick({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
  }
  assert.equal(view.data.confirms.length, 2);
  view.data.adminDirty = false;
  view.data.adminSaving = true;
  const busyLink = nodes(view.render()).find(
    (node) => node.type === 'a' && node.props.to.includes('section=forms'),
  );
  let prevented = false;
  busyLink.props.onClick({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(view.data.confirms.length, 2);
  button(view.render(), 'Page').props.onClick();
  assert.equal(button(view.render(), 'Overview').props['aria-pressed'], true);
});

test('a parent page draft remains registered while a pristine nested form editor is open', async () => {
  const view = fixture('ContentPageEditor', { page: existing });
  control(view.render(), 'Page title', 'input').props.onChange({
    target: { value: 'Changed programme title' },
  });
  button(view.render(), '+ Create new form').props.onClick();
  view.render();
  assert.equal(view.data.dirty, true);
  assert.equal(await view.data.save(), false);
  assert.equal(view.calls.length, 0);
  const tree = view.render();
  assert.match(textOf(tree), /Finish or close the form editor before saving this page/);
  const builder = nodes(tree).find((node) => typeof node.props?.onSaved === 'function');
  assert.ok(builder);
  builder.props.onClose();
  assert.equal(
    control(view.render(), 'Page title', 'input').props.value,
    'Changed programme title',
  );
  assert.equal(view.data.dirty, true);
});

test('page saves retain dirty registration and expose local busy until the save finishes', async () => {
  let finish;
  const view = fixture(
    'ContentPageEditor',
    { page: existing },
    {
      supabase: {
        rpc: (_name, payload) =>
          new Promise((resolve) => {
            finish = () =>
              resolve({ data: { ...payload.p_page, updated_at: '2026-10-14T12:00:00Z' } });
          }),
      },
    },
  );
  control(view.render(), 'Page title', 'input').props.onChange({
    target: { value: 'Updated title' },
  });
  view.render();
  const pending = view.data.save();
  view.render();
  assert.equal(view.data.dirty, true);
  assert.equal(view.data.busy, true);
  finish();
  await pending;
  view.render();
  assert.equal(view.data.dirty, false);
  assert.equal(view.data.busy, false);
});
