import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';

const require = createRequire(import.meta.url);
const stubs = {
  '@/lib/supabaseClient': 'export const supabase = globalThis.fixture.supabase;',
  '@/context/AuthContext': 'export const useAuth = () => ({can:globalThis.fixture.can});',
  '@/context/AdminSaveContext':
    'export const useRegisterAdminSave = (save,dirty,label,busy) => {globalThis.fixture.save=save;globalThis.fixture.dirty=dirty;globalThis.fixture.saveLabel=label;globalThis.fixture.busy=busy;};',
  '@/lib/imageUpload': 'export const createImageUploader = () => globalThis.fixture.upload;',
};
const bundled = await build({
  entryPoints: [
    new URL('../src/components/admin/PageSectionsEditor.jsx', import.meta.url).pathname,
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  alias: { '@': new URL('../src', import.meta.url).pathname },
  plugins: [
    {
      name: 'page-block-editor-fixture',
      setup(builder) {
        builder.onResolve({ filter: /^@\// }, ({ path }) =>
          Object.hasOwn(stubs, path) ? { path, namespace: 'fixture' } : null,
        );
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents: stubs[path],
        }));
        builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({ path, namespace: 'empty-css' }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
      },
    },
  ],
});

const existing = (number, title) => ({
  id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
  page_path: '/education',
  section_key: `section-${number}`,
  title,
  body: `Information for ${title}`,
  background_image_url: '',
  image_urls: [],
  sort_order: number - 1,
  published: true,
  updated_at: '2026-10-14T10:00:00Z',
});

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
function button(tree, label) {
  const found = nodes(tree).find((node) => node.type === 'button' && textOf(node).trim() === label);
  assert.ok(found, `Button: ${label}`);
  return found;
}
function control(tree, label, type) {
  const field = nodes(tree).find(
    (node) => node.type === 'label' && textOf(node).trim().startsWith(label),
  );
  assert.ok(field, `Field: ${label}`);
  const found = nodes(field).find((node) => node.type === type);
  assert.ok(found, `${type}: ${label}`);
  return found;
}

function fixture(overrides = {}, props = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let changed = true;
  let serial = 100;
  const calls = [];
  const events = [];
  const uploads = [];
  const listeners = new Map();
  const data = {
    rows: [existing(1, 'First block'), existing(2, 'Second block')],
    can: () => true,
    confirmed: true,
    confirms: [],
    loadError: null,
    savedCallbacks: 0,
    ...overrides,
  };
  const orders = [];
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    order(column) {
      orders.push(column);
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve({ data: structuredClone(data.rows), error: data.loadError }).then(
        resolve,
        reject,
      );
    },
  };
  data.supabase = {
    from(table) {
      assert.equal(table, 'page_sections');
      return query;
    },
    async rpc(name, payload) {
      calls.push({ name, payload });
      if (data.response) return data.response(name, payload);
      data.rows = payload.p_sections
        .filter((row) => row.page_path === payload.p_page_path)
        .map((row, index) => ({
          ...structuredClone(row),
          id: row.id || existing(++serial, '').id,
          sort_order: index,
          updated_at: '2026-10-14T11:00:00Z',
        }));
      return { data: structuredClone(data.rows), error: null };
    },
  };
  data.upload = async (file, folder) => {
    uploads.push({ file, folder });
    return `https://example.test/${file.name}`;
  };
  const dependenciesChanged = (previous, next) =>
    !previous || !next || next.some((value, index) => !Object.is(value, previous[index]));
  const hooks = {
    ...React,
    useId() {
      return hooks.useMemo(() => ':block-editor:', []);
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          const next = typeof value === 'function' ? value(slots[index]) : value;
          if (!Object.is(next, slots[index])) {
            slots[index] = next;
            changed = true;
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ||= { current: initial });
    },
    useMemo(factory, dependencies) {
      const index = cursor++;
      if (dependenciesChanged(slots[index]?.dependencies, dependencies))
        slots[index] = { value: factory(), dependencies };
      return slots[index].value;
    },
    useCallback(callback, dependencies) {
      return hooks.useMemo(() => callback, dependencies);
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (dependenciesChanged(slots[index]?.dependencies, dependencies)) {
        const previous = slots[index];
        slots[index] = { dependencies };
        effects.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  class FixtureURL extends URL {
    static createObjectURL(file) {
      return `blob:${file.name}`;
    }
    static revokeObjectURL() {}
  }
  const context = {
    module: { exports: {} },
    fixture: data,
    crypto: { randomUUID: () => existing(++serial, '').id },
    URL: FixtureURL,
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
    document: {
      elementsFromPoint: () => data.hitElements || [],
      getElementById: () => null,
    },
    window: {
      confirm(message) {
        data.confirms.push(message);
        return data.confirmed;
      },
      dispatchEvent(event) {
        events.push(event.type);
      },
      addEventListener(name, callback) {
        listeners.set(name, callback);
      },
      removeEventListener(name) {
        listeners.delete(name);
      },
    },
    require: (name) => (name === 'react' ? hooks : require(name)),
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  const Component = context.module.exports.default;
  const properties = {
    pagePath: '/education',
    onSaved: () => {
      data.savedCallbacks += 1;
    },
    ...props,
  };
  function render() {
    let tree;
    let passes = 0;
    do {
      changed = false;
      cursor = 0;
      effects = [];
      tree = Component(properties);
      effects.forEach((effect) => effect());
      assert.ok(++passes < 15, 'page-block editor effects settle');
    } while (changed);
    return tree;
  }
  return {
    data,
    calls,
    events,
    uploads,
    orders,
    properties,
    render,
    async ready() {
      let tree;
      for (let index = 0; index < 10; index += 1) {
        tree = render();
        await Promise.resolve();
      }
      return tree;
    },
  };
}

function block(tree, title) {
  const found = nodes(tree).find(
    (node) =>
      node.type === 'li' &&
      nodes(node).some((child) => child.type === 'strong' && textOf(child).endsWith(`. ${title}`)),
  );
  assert.ok(found, `Block: ${title}`);
  return found;
}
function openBlock(view, title) {
  const row = block(view.render(), title);
  const toggle = nodes(row).find(
    (node) => node.type === 'button' && node.props['aria-expanded'] != null,
  );
  if (!toggle.props['aria-expanded']) toggle.props.onClick();
  return block(view.render(), title);
}
function labelledButton(tree, label) {
  const found = nodes(tree).find(
    (node) => node.type === 'button' && node.props['aria-label'] === label,
  );
  assert.ok(found, `Button: ${label}`);
  return found;
}
const titles = (tree) =>
  nodes(tree)
    .filter((node) => node.type === 'strong')
    .map(textOf);
const plain = (value) => JSON.parse(JSON.stringify(value));

test('editing and collapsing multiple blocks keeps every draft until one atomic save', async () => {
  const view = fixture();
  await view.ready();
  const initial = structuredClone(view.data.rows);
  control(openBlock(view, 'First block'), 'Heading', 'input').props.onChange({
    target: { value: 'First edited' },
  });
  control(openBlock(view, 'Second block'), 'Information', 'textarea').props.onChange({
    target: { value: 'Second edited information' },
  });
  let first = openBlock(view, 'First edited');
  assert.equal(control(first, 'Heading', 'input').props.value, 'First edited');
  const toggle = nodes(first).find(
    (node) => node.type === 'button' && node.props['aria-expanded'] === true,
  );
  toggle.props.onClick();
  first = openBlock(view, 'First edited');
  assert.equal(control(first, 'Heading', 'input').props.value, 'First edited');
  assert.equal(
    control(openBlock(view, 'Second block'), 'Information', 'textarea').props.value,
    'Second edited information',
  );
  assert.equal(view.calls.length, 0);
  assert.equal(view.data.dirty, true);
  await view.data.save();
  assert.equal(view.calls.length, 1);
  assert.equal(view.calls[0].name, 'save_page_sections');
  assert.equal(view.calls[0].payload.p_page_path, '/education');
  assert.deepEqual(
    plain(view.calls[0].payload.p_expected),
    initial.map(({ id, updated_at }) => ({ id, updated_at })),
  );
  assert.deepEqual(
    plain(view.calls[0].payload.p_sections).map(({ title, body }) => ({ title, body })),
    [
      { title: 'First edited', body: 'Information for First block' },
      { title: 'Second block', body: 'Second edited information' },
    ],
  );
  view.render();
  assert.equal(view.data.dirty, false);
  assert.equal(view.data.savedCallbacks, 1);
  assert.deepEqual(view.events, ['jic-content-updated']);
});

test('new content starts hidden, is local until save, and is removable without delete permission', async () => {
  const view = fixture({ can: (permission) => permission !== 'delete_content' });
  await view.ready();
  button(view.render(), 'Add content block').props.onClick();
  let row = openBlock(view, 'Untitled block');
  assert.equal(control(row, 'Show on website', 'input').props.checked, false);
  assert.equal(view.calls.length, 0);
  assert.equal(view.data.dirty, true);
  button(row, 'Remove content block').props.onClick();
  assert.deepEqual(titles(view.render()), ['1. First block', '2. Second block']);
  assert.equal(view.data.dirty, false);
  button(view.render(), 'Add content block').props.onClick();
  row = openBlock(view, 'Untitled block');
  control(row, 'Heading', 'input').props.onChange({ target: { value: 'New draft' } });
  view.render();
  await view.data.save();
  const created = view.calls[0].payload.p_sections.at(-1);
  assert.equal(created.id, null);
  assert.equal(created.published, false);
  assert.equal(created.page_path, '/education');
});

test('existing block removal requires delete permission and removal stays staged and undoable', async () => {
  const denied = fixture({ can: (permission) => permission !== 'delete_content' });
  await denied.ready();
  assert.ok(
    !nodes(openBlock(denied, 'First block')).some(
      (node) => node.type === 'button' && textOf(node).trim() === 'Remove content block',
    ),
  );
  const allowed = fixture();
  await allowed.ready();
  button(openBlock(allowed, 'First block'), 'Remove content block').props.onClick();
  assert.deepEqual(titles(allowed.render()), ['1. Second block']);
  assert.equal(allowed.calls.length, 0);
  button(allowed.render(), 'Undo last change').props.onClick();
  assert.deepEqual(titles(allowed.render()), ['1. First block', '2. Second block']);
  assert.equal(allowed.data.dirty, false);
});

test('up/down ordering, destination and visibility share the page draft and can all be discarded', async () => {
  const view = fixture();
  await view.ready();
  labelledButton(view.render(), 'Move Second block up').props.onClick();
  let row = openBlock(view, 'Second block');
  control(row, 'Show this block on page', 'select').props.onChange({ target: { value: '/youth' } });
  row = openBlock(view, 'Second block');
  control(row, 'Show on website', 'input').props.onChange({ target: { checked: false } });
  assert.deepEqual(titles(view.render()), ['1. Second block', '2. First block']);
  assert.equal(view.calls.length, 0);
  view.data.confirmed = false;
  button(view.render(), 'Discard block changes').props.onClick();
  assert.equal(view.data.dirty, true);
  view.data.confirmed = true;
  button(view.render(), 'Discard block changes').props.onClick();
  assert.deepEqual(titles(view.render()), ['1. First block', '2. Second block']);
  assert.equal(
    control(openBlock(view, 'Second block'), 'Show this block on page', 'select').props.value,
    '/education',
  );
  assert.equal(
    control(openBlock(view, 'Second block'), 'Show on website', 'input').props.checked,
    true,
  );
  assert.equal(view.data.dirty, false);
});

test('failed or incomplete saves retain drafts, versions and retry ability', async () => {
  const view = fixture({
    response: async () => ({ error: new Error('Another editor changed these blocks.') }),
  });
  await view.ready();
  control(openBlock(view, 'First block'), 'Heading', 'input').props.onChange({
    target: { value: 'Still my draft' },
  });
  view.render();
  await assert.rejects(view.data.save, /Another editor/);
  assert.match(textOf(view.render()), /Another editor changed these blocks/);
  assert.equal(view.data.dirty, true);
  assert.equal(view.events.length, 0);
  assert.equal(
    control(openBlock(view, 'Still my draft'), 'Heading', 'input').props.value,
    'Still my draft',
  );
  view.data.response = async () => ({ data: null, error: null });
  await assert.rejects(view.data.save, /response was incomplete/);
  assert.equal(view.data.dirty, true);
  assert.deepEqual(
    plain(view.calls[0].payload.p_expected),
    plain(view.calls[1].payload.p_expected),
  );
  view.data.response = null;
  await view.data.save();
  view.render();
  assert.equal(view.data.dirty, false);
});

test('an in-flight save rejects duplicate requests and stale edit, undo and discard handlers', async () => {
  let complete;
  const view = fixture({
    response: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  await view.ready();
  control(openBlock(view, 'First block'), 'Heading', 'input').props.onChange({
    target: { value: 'Submitted title' },
  });
  const tree = view.render();
  const save = view.data.save;
  const pending = save();
  assert.equal(await save(), false);
  control(tree, 'Heading', 'input').props.onChange({ target: { value: 'Should be blocked' } });
  button(tree, 'Undo last change').props.onClick();
  button(tree, 'Discard block changes').props.onClick();
  assert.equal(
    control(openBlock(view, 'Submitted title'), 'Heading', 'input').props.value,
    'Submitted title',
  );
  assert.equal(view.data.dirty, true);
  assert.equal(view.data.busy, true);
  assert.equal(view.calls.length, 1);
  assert.equal(view.data.confirms.length, 0);
  complete({
    data: view.calls[0].payload.p_sections.map((row) => ({ ...row, updated_at: 'saved' })),
    error: null,
  });
  await pending;
  view.render();
  assert.equal(view.data.dirty, false);
  assert.equal(view.data.busy, false);
});

test('failed initial loading does not allow adding or saving an empty replacement', async () => {
  const view = fixture({ loadError: new Error('Unable to load blocks') });
  let tree = await view.ready();
  assert.match(textOf(tree), /Unable to load blocks/);
  assert.equal(button(tree, 'Add content block').props.disabled, true);
  button(tree, 'Add content block').props.onClick();
  assert.equal(await view.data.save(), false);
  assert.equal(view.calls.length, 0);
  view.data.loadError = null;
  button(view.render(), 'Reload saved blocks').props.onClick();
  tree = await view.ready();
  assert.deepEqual(titles(tree), ['1. First block', '2. Second block']);
});

test('pointer reorder has one undo checkpoint and cancelling restores the original order', async () => {
  const view = fixture({
    rows: [existing(1, 'First block'), existing(2, 'Second block'), existing(3, 'Third block')],
  });
  await view.ready();
  const capture = {
    pointer: null,
    setPointerCapture(id) {
      this.pointer = id;
    },
    hasPointerCapture(id) {
      return this.pointer === id;
    },
    releasePointerCapture() {
      this.pointer = null;
    },
  };
  const pointer = {
    pointerId: 7,
    button: 0,
    isPrimary: true,
    currentTarget: capture,
    preventDefault() {},
    clientX: 50,
    clientY: 50,
  };
  const list = nodes(view.render()).find((node) => node.type === 'ol');
  list.ref.current = { contains: () => true };
  const hit = (id) => ({ closest: () => ({ dataset: { pageBlockId: id } }) });
  let handle = labelledButton(view.render(), 'Drag First block to reorder');
  handle.props.onPointerDown(pointer);
  view.data.hitElements = [hit(existing(2, '').id)];
  handle.props.onPointerMove(pointer);
  view.data.hitElements = [hit(existing(3, '').id)];
  handle.props.onPointerMove(pointer);
  const duringDrag = nodes(view.render()).filter((node) => node.type === 'li');
  assert.deepEqual(
    duringDrag.map((node) => node.props['data-page-block-id']),
    [existing(1, '').id, existing(2, '').id, existing(3, '').id],
    'captured DOM node stays in place until pointer capture ends',
  );
  assert.deepEqual(
    duringDrag.sort((a, b) => a.props.style.order - b.props.style.order).flatMap(titles),
    ['1. Second block', '2. Third block', '3. First block'],
  );
  assert.equal(await view.data.save(), false, 'saving waits for drag to finish');
  handle.props.onPointerUp(pointer);
  button(view.render(), 'Undo last change').props.onClick();
  assert.deepEqual(titles(view.render()), ['1. First block', '2. Second block', '3. Third block']);
  assert.equal(button(view.render(), 'Undo last change').props.disabled, true);
  handle = labelledButton(view.render(), 'Drag First block to reorder');
  handle.props.onPointerDown(pointer);
  handle.props.onPointerMove(pointer);
  handle.props.onPointerCancel(pointer);
  assert.deepEqual(titles(view.render()), ['1. First block', '2. Second block', '3. Third block']);
  assert.equal(view.data.dirty, false);
  assert.equal(view.calls.length, 0);
});

test('keyboard reorder is available without drag and does not write immediately', async () => {
  const view = fixture();
  await view.ready();
  let prevented = false;
  labelledButton(view.render(), 'Drag Second block to reorder').props.onKeyDown({
    key: 'ArrowUp',
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.deepEqual(titles(view.render()), ['1. Second block', '2. First block']);
  assert.equal(view.data.dirty, true);
  assert.equal(view.calls.length, 0);
  await view.data.save();
  assert.deepEqual(
    plain(view.calls[0].payload.p_sections).map((row) => row.title),
    ['Second block', 'First block'],
  );
});

test('picture selection respects media permission and a failed save retries without reuploading', async () => {
  const denied = fixture({ can: (permission) => permission !== 'media' });
  await denied.ready();
  assert.ok(
    !nodes(openBlock(denied, 'First block')).some(
      (node) => node.type === 'input' && node.props.type === 'file',
    ),
  );

  const view = fixture({ response: async () => ({ error: new Error('Please retry saving') }) });
  await view.ready();
  let row = openBlock(view, 'First block');
  const file = { name: 'picture.jpg', type: 'image/jpeg', size: 100 };
  control(row, 'Choose background', 'input').props.onChange({
    target: { files: [file], value: 'selected' },
  });
  row = openBlock(view, 'First block');
  assert.ok(
    nodes(row).some((node) => node.type === 'img' && node.props.src === 'blob:picture.jpg'),
  );
  assert.equal(view.uploads.length, 0);
  assert.equal(view.data.dirty, true);
  await assert.rejects(view.data.save, /Please retry/);
  assert.equal(view.uploads.length, 1);
  assert.equal(
    view.calls[0].payload.p_sections[0].background_image_url,
    'https://example.test/picture.jpg',
  );
  view.data.response = null;
  await view.data.save();
  assert.equal(view.uploads.length, 1, 'already-uploaded file is reused by the retry');
  view.render();
  assert.equal(view.data.dirty, false);
});

test('invalid pictures are rejected before they become drafts or uploads', async () => {
  const view = fixture();
  await view.ready();
  const row = openBlock(view, 'First block');
  control(row, 'Choose gallery pictures', 'input').props.onChange({
    target: { files: [{ name: 'photo.heic', type: 'image/heic', size: 10 }], value: 'selected' },
  });
  assert.match(textOf(view.render()), /export HEIC photos as JPG first/);
  assert.equal(view.data.dirty, false);
  assert.equal(view.uploads.length, 0);
  assert.equal(view.calls.length, 0);
});

test('conflict reload is explicit and cancellation keeps every unsaved block', async () => {
  const view = fixture({
    response: async () => ({ error: new Error('Content changed. Reload before saving.') }),
  });
  await view.ready();
  control(openBlock(view, 'First block'), 'Heading', 'input').props.onChange({
    target: { value: 'My draft' },
  });
  view.render();
  await assert.rejects(view.data.save, /Content changed/);
  view.data.rows = [existing(3, 'Another editor’s block')];
  view.data.confirmed = false;
  button(view.render(), 'Reload saved blocks').props.onClick();
  await view.ready();
  assert.deepEqual(titles(view.render()), ['1. My draft', '2. Second block']);
  view.data.confirmed = true;
  button(view.render(), 'Reload saved blocks').props.onClick();
  const tree = await view.ready();
  assert.deepEqual(titles(tree), ['1. Another editor’s block']);
  assert.equal(view.data.dirty, false);
});
