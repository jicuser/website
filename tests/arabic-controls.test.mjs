import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { NOUNS } from '../src/features/arabic/grammar.mjs';

const require = createRequire(import.meta.url);
const bundles = Object.fromEntries(
  await Promise.all(
    ['SentenceBuilder', 'ArabicControls'].map(async (name) => {
      const result = await build({
        entryPoints: [new URL(`../src/features/arabic/${name}.jsx`, import.meta.url).pathname],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        packages: 'external',
        write: false,
        plugins: [
          {
            name: 'ignore-style-only-imports',
            setup(builder) {
              builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({
                path,
                namespace: 'empty-css',
              }));
              builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
            },
          },
        ],
      });
      return [name, result.outputFiles[0].text];
    }),
  ),
);

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function content(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree) return '';
  return Array.isArray(tree) ? tree.map(content).join('') : content(tree.props?.children);
}

// Use the repository's component-fixture approach: compile the actual JSX and
// exercise its real handlers, replacing only React's hook storage and browser APIs.
function fixture(name = 'SentenceBuilder', exportName = 'default', props = {}, globals = {}) {
  const slots = [];
  let cursor = 0,
    effects = [],
    tree;
  const runtime = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
    useMemo(callback) {
      cursor++;
      return callback();
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i])))
        slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useId() {
      return `sentence-fixture-${cursor++}`;
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ||= { current: initial });
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        slots[index] = { deps };
        effects.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const copies = [];
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? runtime : require(name)),
    navigator: { clipboard: { writeText: async (value) => copies.push(value) } },
    ...globals,
  };
  runInNewContext(bundles[name], context);
  const Component = context.module.exports[exportName];
  return {
    props,
    copies,
    render(attachRef) {
      cursor = 0;
      effects = [];
      tree = Component(props);
      attachRef?.(tree);
      effects.forEach((effect) => effect());
      return tree;
    },
    get tree() {
      return tree;
    },
    all(type) {
      return nodes(tree).filter((node) => node.type?.name === type);
    },
    child(type) {
      return this.all(type)[0];
    },
    button(label) {
      return nodes(tree).find((node) => node.type === 'button' && content(node).trim() === label);
    },
    option(label) {
      return this.all('OptionButton').find((node) => node.props.label === label);
    },
    picker(label, index = 0) {
      return this.all('PickerButton').filter((node) => node.props.label === label)[index];
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
const click = (ui, node) => {
  assert.ok(node, 'requested control exists');
  node.props.onClick();
  ui.render();
};
const current = (ui) => ui.child('ArabicResult').props;
const currentPartExists = (ui) =>
  current(ui).result.segments.some((part) => part.id === current(ui).selectedPart);

test('number choices highlight the visible stem, count ending, or joined count + my', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.picker('How many?'));
  assert.equal(current(ui).selectedPart, 'subject:stem');
  assert.ok(currentPartExists(ui));
  click(ui, ui.option('Two'));
  assert.equal(current(ui).selectedPart, 'subject:number');
  click(ui, ui.option('Several'));
  assert.equal(current(ui).selectedPart, 'subject:stem');
  click(ui, ui.picker('Whose?'));
  click(ui, ui.option('My'));
  click(ui, ui.picker('How many?'));
  click(ui, ui.option('Two'));
  assert.equal(current(ui).selectedPart, 'subject:owner');
  assert.ok(currentPartExists(ui));
});

test('removing an owner moves its active highlight to the actual article', () => {
  const ui = fixture();
  ui.render();
  current(ui).onPartClick('subject:owner');
  ui.render();
  assert.equal(ui.child('InlineChoices').props.title, 'Whose thing?');
  click(ui, ui.option('No owner'));
  assert.equal(current(ui).result.translation, 'The book is in his house.');
  assert.equal(current(ui).selectedPart, 'subject:article');
  assert.ok(currentPartExists(ui));
  assert.equal(ui.picker('Whose?').props.expanded, true);
});

test('action time and person controls select existing corresponding parts after changes', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.button('An action'));
  click(ui, ui.picker('When?'));
  assert.ok(currentPartExists(ui), 'past tense has no separate context prefix');
  click(ui, ui.option('Now / usually'));
  assert.equal(current(ui).selectedPart, 'action:case');
  click(ui, ui.option('Will happen'));
  assert.equal(current(ui).selectedPart, 'action:context');
  click(ui, ui.picker('Who?'));
  click(ui, ui.option('You · one woman'));
  ui.child('InlineChoices').props.onClose();
  ui.render();
  current(ui).onPartClick('action:ending');
  ui.render();
  click(ui, ui.option('He'));
  assert.equal(current(ui).selectedPart, 'action:prefix');
  assert.ok(currentPartExists(ui));
});

test('the full vocabulary remains searchable and unsupported plurals reset safely', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.picker('How many?'));
  click(ui, ui.option('Several'));
  click(ui, ui.picker('Word'));
  assert.equal(ui.all('OptionButton').length, 8);
  click(ui, ui.button(`All ${NOUNS.length} words`));
  assert.equal(ui.all('OptionButton').length, NOUNS.length);
  const search = nodes(ui.tree).find((node) => node.type === 'input');
  search.props.onChange({ target: { value: 'لَيْلَة' } });
  ui.render();
  assert.equal(ui.all('OptionButton').length, 1);
  click(ui, ui.option('Night'));
  assert.equal(ui.picker('How many?').props.value, 'One');
  assert.match(current(ui).result.translation, /^Our night is/);
  assert.ok(ui.child('InlineChoices'), 'choice remains open after updating');
});

test('each sentence field opens its own identified inline panel and keeps live options', () => {
  const ui = fixture();
  ui.render();
  const before = current(ui).result.arabic;
  click(ui, ui.picker('Whose?'));
  const first = ui.child('InlineChoices');
  assert.equal(ui.picker('Whose?').props.controlsId, first.props.id);
  assert.equal(ui.picker('Whose?').props.expanded, true);
  click(ui, ui.option('My'));
  assert.notEqual(current(ui).result.arabic, before);
  assert.equal(ui.child('InlineChoices').key, first.key);
  click(ui, ui.picker('Whose?', 1));
  assert.notEqual(ui.child('InlineChoices').key, first.key, 'new field captures its own opener');
  assert.equal(ui.picker('Whose?').props.expanded, false);
  assert.equal(ui.picker('Whose?', 1).props.expanded, true);
  assert.equal(ui.option('His').props.latin, 'hi');
});

test('question constraints, place normalization, and exact copy survive inline changes', async () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.button('An action'));
  click(ui, ui.button('Ask a question'));
  click(ui, ui.picker('When?'));
  click(ui, ui.option('Did not'));
  assert.equal(current(ui).result.grammar.question, false);
  assert.equal(ui.button('Ask a question').props.disabled, true);
  click(ui, ui.option('Happened'));
  click(ui, ui.picker('Action'));
  click(ui, ui.option('Go out'));
  assert.match(current(ui).result.translation, /went out from/);
  click(ui, ui.picker('Where?'));
  assert.deepEqual(
    ui.all('OptionButton').map((node) => node.props.label),
    ['From…', 'To…'],
  );
  const output = current(ui).result;
  await ui.button('Copy').props.onClick();
  ui.render();
  assert.equal(ui.copies[0], `${output.arabic}\n${output.latin}\n${output.translation}`);
});

test('internal stem marks explain the sound while keeping only grammatical word choices', () => {
  const ui = fixture();
  ui.render();
  current(ui).onPartClick('subject:stem', { character: 'ِ', mark: 'kasra' });
  ui.render();
  assert.equal(
    ui.child('InlineChoices').props.description,
    'This sound belongs to the word. Choose another word to compare.',
  );
  assert.ok(ui.option('House'));
  assert.equal(ui.picker('Word').props.expanded, true);
  assert.equal(current(ui).selectedPart, 'subject:stem');
});

function focusFixture({ fromGlyph = false, expandedPicker = true } = {}) {
  const document = { activeElement: null };
  class Element {
    constructor(button = true) {
      this.isConnected = true;
      this.button = button;
      this.focused = 0;
    }
    matches(selector) {
      return selector === 'button' && this.button;
    }
    focus() {
      document.activeElement = this;
      this.focused++;
    }
  }
  const opener = new Element(),
    picker = new Element(),
    option = new Element(),
    piece = new Element();
  const outside = new Element(false);
  const members = new Set([opener, picker, option, piece]);
  const listeners = new Map();
  const builder = {
    contains: (node) => members.has(node),
    querySelector: (selector) => {
      if (selector.includes('aria-expanded')) return expandedPicker ? picker : null;
      if (selector.includes('aria-pressed')) return piece;
      return null;
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const tray = { closest: () => builder };
  document.activeElement = fromGlyph ? outside : opener;
  let closes = 0;
  const ui = fixture(
    'ArabicControls',
    'InlineChoices',
    {
      id: 'choices',
      title: 'Whose?',
      onClose: () => {
        closes++;
      },
      children: null,
    },
    { document, HTMLElement: Element },
  );
  const render = () =>
    ui.render((tree) => {
      tree.ref.current = tray;
    });
  render();
  return {
    ui,
    opener,
    picker,
    option,
    piece,
    document,
    listeners,
    render,
    get closes() {
      return closes;
    },
  };
}

test('Escape immediately after opening a picker closes the tray and restores that opener', () => {
  const view = focusFixture();
  assert.equal(view.document.activeElement, view.opener, 'opening does not steal focus');
  let stopped = false;
  view.listeners.get('keydown')({
    key: 'Escape',
    stopPropagation: () => {
      stopped = true;
    },
  });
  assert.equal(stopped, true);
  assert.equal(view.closes, 1);
  assert.equal(view.document.activeElement, view.opener);
  assert.equal(view.opener.focused, 1);
});

test('live choices preserve their focus and Done returns to the original opener', () => {
  const view = focusFixture();
  view.document.activeElement = view.option;
  view.render();
  assert.equal(
    view.document.activeElement,
    view.option,
    'rerender keeps the comparison choice focused',
  );
  click(view.ui, view.ui.button('Done'));
  assert.equal(view.document.activeElement, view.opener);
  assert.equal(view.closes, 1);
});

test('a removed result piece returns focus to the stable expanded picker', () => {
  const view = focusFixture();
  view.opener.isConnected = false;
  view.document.activeElement = view.option;
  view.ui.button('Done').props.onClick();
  assert.equal(view.document.activeElement, view.picker);
  assert.equal(view.picker.focused, 1);
});

test('opening via an unfocusable glyph returns to its equivalent expanded picker', () => {
  const view = focusFixture({ fromGlyph: true });
  view.ui.button('Done').props.onClick();
  assert.equal(view.document.activeElement, view.picker);
  assert.equal(view.picker.focused, 1);
});

test('pattern changes retain a visible focus fallback without an expanded slot picker', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.button('This is…'));
  current(ui).onPartClick('subject:context');
  ui.render();
  click(ui, ui.option('Where it is'));
  assert.equal(
    ui.all('PickerButton').some((node) => node.props.expanded),
    false,
  );
  assert.equal(
    current(ui).result.segments.some((part) => part.id === 'subject:context'),
    false,
  );
  assert.ok(currentPartExists(ui), 'the vanished pointing word has a visible replacement');

  const view = focusFixture({ expandedPicker: false });
  view.opener.isConnected = false;
  view.document.activeElement = view.option;
  view.ui.button('Done').props.onClick();
  assert.equal(view.document.activeElement, view.piece);
  assert.equal(view.piece.focused, 1);
});

test('closing the mounted panel lifecycle removes its Escape listener', () => {
  const view = focusFixture();
  assert.equal(view.listeners.size, 1);
  view.ui.unmount();
  assert.equal(view.listeners.size, 0, 'a closed or replaced tray cannot keep handling Escape');
});
