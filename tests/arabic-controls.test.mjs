import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { NOUNS, PERSONS, TENSES, buildVerb } from '../src/features/arabic/grammar.mjs';
import { buildSentence, INITIAL_SENTENCE } from '../src/features/arabic/sentences.mjs';
import { segmentRanges } from '../src/features/arabic/arabicConnectionModel.mjs';

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
const tapMeaning = (ui, meaningId) => {
  const props = current(ui);
  assert.ok(
    props.result.englishParts.some((part) => part.id === meaningId),
    `the English meaning ${meaningId} is visible`,
  );
  const target = props.meaningTargets[meaningId];
  const targetIds = typeof target === 'string' ? [target] : target;
  assert.ok(targetIds?.length, 'the meaning connects to an actual Arabic part');
  props.onPartClick(targetIds[0], { meaningId, targetIds });
  ui.render();
};

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
  tapMeaning(ui, 'subject:owner');
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
  assert.equal(current(ui).controlLabels['subject:article'], 'Change thing owner: No owner');
  assert.equal(current(ui).choiceControlsId, ui.child('InlineChoices').props.id);
  const addOwner = nodes(ui.tree).find(
    (node) => node.props?.['aria-label'] === 'Add an owner to the thing',
  );
  assert.equal(addOwner.props['aria-expanded'], true);
  ui.child('InlineChoices').props.onClose();
  ui.render();
  click(
    ui,
    nodes(ui.tree).find((node) => node.props?.['aria-label'] === 'Add an owner to the thing'),
  );
  click(ui, ui.option('My'));
  assert.equal(current(ui).result.translation, 'My book is in his house.');
});

test('action time and person controls select existing corresponding parts after changes', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.button('An action'));
  click(ui, ui.picker('When?'));
  assert.ok(currentPartExists(ui), 'past tense has no separate context prefix');
  click(ui, ui.option('Now / usually'));
  assert.equal(current(ui).selectedPart, 'action:case');
  assert.equal(current(ui).controlLabels['action:case'], 'Change action ending sound');
  assert.notEqual(
    current(ui).controlLabels['action:case'],
    current(ui).controlLabels['action:context'],
  );
  click(ui, ui.option('Will happen'));
  assert.equal(current(ui).selectedPart, 'action:context');
  tapMeaning(ui, 'action:prefix');
  click(ui, ui.option('You · one woman'));
  ui.child('InlineChoices').props.onClose();
  ui.render();
  current(ui).onPartClick('action:ending');
  ui.render();
  click(ui, ui.option('He'));
  assert.equal(current(ui).selectedPart, 'action:prefix');
  assert.ok(currentPartExists(ui));
});

test('a direct verb ending mark keeps its exact close-up while the person prefix is selected', () => {
  for (const selectedMeaningId of ['prefix', undefined]) {
    const result = buildVerb({ tenseId: 'present', personId: 'you_f' });
    const ending = segmentRanges(result).find((part) => part.id === 'ending');
    const props = { result, selectedPart: 'prefix', selectedMeaningId, onPartClick() {} };
    const ui = fixture('ArabicControls', 'ArabicResult', props);
    ui.render();
    ui.child('ArabicGlyphs').props.onPartClick('ending', {
      character: 'ِ',
      mark: 'kasra',
      sourceIndex: ending.start,
    });
    ui.render();
    assert.equal(ui.child('ArabicGlyphs').props.selectedSourceIndex, ending.start);
    assert.equal(ui.child('ArabicGlyphCloseup').props.sourceIndex, ending.start);
    assert.deepEqual([...ui.child('ArabicConnectionLayer').props.partIds], ['ending']);
    assert.equal(ui.child('ArabicConnectionLayer').props.sourceIndex, ending.start);
    ui.render();
    assert.equal(
      ui.child('ArabicGlyphCloseup').props.sourceIndex,
      ending.start,
      'live tray rerenders retain the tapped ending',
    );

    props.result = buildVerb({ tenseId: 'present', personId: 'he' });
    ui.render();
    assert.equal(
      ui.child('ArabicGlyphCloseup'),
      undefined,
      'a removed person ending is not replaced with the ordinary final u',
    );
    assert.equal(ui.child('ArabicGlyphs').props.selectedSourceIndex, undefined);
  }
});

test('sentence person mark selection uses the actual English prefix, ending or question-person ID', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.button('An action'));
  current(ui).onPartClick('action:ending', { character: 'ْ', mark: 'sukun' });
  ui.render();
  assert.equal(current(ui).selectedPart, 'action:ending');
  assert.equal(current(ui).selectedMeaningId, 'action:ending');

  click(ui, ui.picker('When?'));
  click(ui, ui.option('Now / usually'));
  tapMeaning(ui, 'action:prefix');
  click(ui, ui.option('You · one woman'));
  const ending = segmentRanges(current(ui).result).find((part) => part.id === 'action:ending');
  current(ui).onPartClick('action:ending', {
    character: 'ِ',
    mark: 'kasra',
    sourceIndex: ending.start,
  });
  ui.render();
  assert.equal(current(ui).selectedPart, 'action:ending');
  assert.equal(current(ui).selectedMeaningId, 'action:prefix');

  const resultView = fixture('ArabicControls', 'ArabicResult', current(ui));
  resultView.render();
  resultView.child('ArabicGlyphs').props.onPartClick('action:ending', {
    character: 'ِ',
    mark: 'kasra',
    sourceIndex: ending.start,
  });
  resultView.render();
  assert.equal(resultView.child('ArabicGlyphCloseup').props.sourceIndex, ending.start);

  click(ui, ui.button('Ask a question'));
  current(ui).onPartClick('action:ending', { character: 'ِ', mark: 'kasra' });
  ui.render();
  assert.equal(current(ui).selectedMeaningId, 'action:person');
  assert.ok(
    current(ui).result.englishParts.some((part) => part.id === current(ui).selectedMeaningId),
  );
});

test('the full vocabulary remains searchable and unsupported plurals reset safely', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.picker('How many?'));
  click(ui, ui.option('Several'));
  tapMeaning(ui, 'subject:stem');
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

test('each sentence meaning opens its own identified inline panel and keeps live options', () => {
  const ui = fixture();
  ui.render();
  const before = current(ui).result.arabic;
  tapMeaning(ui, 'subject:owner');
  const first = ui.child('InlineChoices');
  assert.equal(current(ui).choiceControlsId, first.props.id);
  assert.equal(current(ui).controlLabels['subject:owner'], 'Change thing owner: Our');
  assert.equal(current(ui).selectedPart, 'subject:owner');
  click(ui, ui.option('My'));
  assert.notEqual(current(ui).result.arabic, before);
  assert.equal(ui.child('InlineChoices').key, first.key);
  tapMeaning(ui, 'place:owner');
  assert.notEqual(ui.child('InlineChoices').key, first.key, 'new field captures its own opener');
  assert.equal(current(ui).selectedPart, 'place:owner');
  assert.equal(current(ui).controlLabels['place:owner'], 'Change place owner: His');
  assert.equal(current(ui).controlLabels['place:case'], 'Change place ending sound');
  assert.notEqual(
    current(ui).controlLabels['place:case'],
    current(ui).controlLabels['place:context'],
  );
  assert.equal(current(ui).choiceControlsId, ui.child('InlineChoices').props.id);
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
  tapMeaning(ui, 'action:stem');
  click(ui, ui.option('Go out'));
  assert.match(current(ui).result.translation, /went out from/);
  tapMeaning(ui, 'place:context');
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
  assert.equal(current(ui).choiceControlsId, ui.child('InlineChoices').props.id);
  assert.equal(current(ui).controlLabels['subject:stem'], 'Change thing: Book');
  assert.equal(current(ui).selectedPart, 'subject:stem');
});

test('a joined two + my meaning opens number choices and follows the changed count', () => {
  const ui = fixture();
  ui.render();
  tapMeaning(ui, 'subject:owner');
  click(ui, ui.option('My'));
  click(ui, ui.picker('How many?'));
  click(ui, ui.option('Two'));
  ui.child('InlineChoices').props.onClose();
  ui.render();
  assert.equal(current(ui).meaningTargets['subject:number'], 'subject:owner');
  assert.equal(current(ui).controlLabels['subject:number'], 'Change how many things: Two');
  tapMeaning(ui, 'subject:number');
  assert.equal(ui.child('InlineChoices').props.title, 'How many?');
  assert.equal(current(ui).selectedPart, 'subject:owner');
  const before = current(ui).result;
  click(ui, ui.option('Several'));
  assert.equal(current(ui).selectedPart, 'subject:stem');
  assert.match(current(ui).result.translation, /^My books /u);
  assert.equal(current(ui).previous, before);
  assert.equal(ui.child('ArabicChangeStory').props.previous, before);
  assert.equal(ui.child('ArabicChangeStory').props.result, current(ui).result);
});

test('question meaning chips still open the correct word, owner and action choices', () => {
  const ui = fixture();
  ui.render();
  click(ui, ui.button('This is…'));
  click(ui, ui.button('Ask a question'));
  assert.equal(current(ui).result.translation, 'Is this our book?');
  tapMeaning(ui, 'subject:owner');
  assert.equal(ui.child('InlineChoices').props.title, 'Whose thing?');
  click(ui, ui.option('My'));
  tapMeaning(ui, 'subject:stem');
  click(ui, ui.option('House'));
  assert.equal(current(ui).result.translation, 'Is this my house?');
  click(ui, ui.button('An action'));
  tapMeaning(ui, 'action:person');
  assert.equal(ui.child('InlineChoices').props.title, 'Who does it?');
  click(ui, ui.option('I'));
  tapMeaning(ui, 'action:stem');
  assert.equal(ui.child('InlineChoices').props.title, 'Choose an action');
  click(ui, ui.option('Drink'));
  assert.equal(current(ui).result.translation, 'Did I drink in his house?');
});

test('tapping a case vowel again keeps its choice tray available for comparison', () => {
  const ui = fixture();
  ui.render();
  current(ui).onPartClick('place:case', { character: 'ِ', mark: 'kasra' });
  ui.render();
  assert.equal(ui.child('InlineChoices').props.title, 'In, from or to?');
  current(ui).onPartClick('place:case', { character: 'ِ', mark: 'kasra' });
  ui.render();
  assert.ok(ui.child('InlineChoices'));
  assert.equal(current(ui).selectedPart, 'place:case');
});

test('place chips, extra number choices, add-place and reset preserve the sentence state', () => {
  const ui = fixture();
  ui.render();
  tapMeaning(ui, 'place:stem');
  click(ui, ui.option('Mosque'));
  tapMeaning(ui, 'place:owner');
  click(ui, ui.option('Her'));
  click(ui, ui.picker('How many?', 1));
  click(ui, ui.option('Two'));
  click(ui, ui.button('An action'));
  assert.equal(current(ui).result.translation, 'We wrote in her two mosques.');
  tapMeaning(ui, 'place:stem');
  click(ui, ui.button('Remove place'));
  assert.equal(current(ui).result.translation, 'We wrote.');
  assert.equal(ui.child('InlineChoices'), undefined);
  assert.equal(
    current(ui).result.englishParts.some((part) => part.id.startsWith('place:')),
    false,
  );
  click(ui, ui.button('Add a place'));
  assert.equal(current(ui).result.translation, 'We wrote in her two mosques.');
  click(ui, ui.button('Reset'));
  assert.equal(current(ui).result.translation, buildSentence(INITIAL_SENTENCE).translation);
  assert.equal(current(ui).previous, null);
  assert.equal(current(ui).selectedPart, null);
  assert.equal(ui.child('InlineChoices'), undefined);
});

test('connected sentence text stays exact, with no invented Arabic target for English auxiliaries', () => {
  const states = [];
  for (const template of ['identify', 'where']) {
    for (const number of ['singular', 'dual', 'plural']) {
      for (const ownerId of ['our', 'my', 'none']) {
        for (const question of [false, true]) {
          states.push({
            ...INITIAL_SENTENCE,
            template,
            question,
            subject: { ...INITIAL_SENTENCE.subject, number, ownerId },
            place: { ...INITIAL_SENTENCE.place, number, ownerId },
          });
        }
      }
    }
  }
  for (const person of PERSONS) {
    for (const tense of TENSES) {
      for (const question of [false, true]) {
        states.push({
          ...INITIAL_SENTENCE,
          template: 'action',
          question,
          action: { ...INITIAL_SENTENCE.action, personId: person.id, tenseId: tense.id },
        });
      }
    }
  }
  for (const state of states) {
    const output = fixture('SentenceBuilder', 'connectedSentence', state).render();
    const expected = buildSentence(state);
    const message = `${state.template}, ${state.subject.number}, ${state.subject.ownerId}, ${state.action.personId}, ${state.action.tenseId}, question ${state.question}`;
    assert.equal(
      output.result.englishParts.map((part) => part.text).join(''),
      expected.translation,
      message,
    );
    assert.equal(output.result.arabic, expected.arabic, message);
    assert.equal(output.result.latin, expected.latin, message);
    assert.equal(
      new Set(output.result.englishParts.map((part) => part.id)).size,
      output.result.englishParts.length,
      message,
    );
    for (const [id, target] of Object.entries(output.meaningTargets)) {
      if (id.startsWith('link:')) {
        assert.equal(target, null, message);
        continue;
      }
      assert.ok(target, `a content meaning has a target: ${id}, ${message}`);
      const targets = typeof target === 'string' ? [target] : target;
      assert.ok(targets.length, message);
      for (const segmentId of targets)
        assert.ok(
          output.result.segments.some((part) => part.id === segmentId),
          `${segmentId}, ${message}`,
        );
    }
  }
});

function focusFixture({ fromGlyph = false, expandedPicker = true } = {}) {
  const document = { activeElement: null };
  class Element {
    constructor(button = true, expanded = false) {
      this.isConnected = true;
      this.button = button;
      this.expanded = expanded;
      this.focused = 0;
    }
    matches(selector) {
      return (
        this.button &&
        (selector === 'button' || (selector === 'button[aria-expanded="true"]' && this.expanded))
      );
    }
    focus() {
      document.activeElement = this;
      this.focused++;
    }
  }
  const opener = new Element(true, true),
    picker = new Element(true, true),
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
    builder,
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

test('closing choices after collapsing their opener disclosure restores its visible summary', () => {
  for (const closeWith of ['Done', 'Escape']) {
    const view = focusFixture();
    const summary = new view.opener.constructor(false);
    const disclosure = {
      open: true,
      querySelector: (selector) => (selector === ':scope > summary' ? summary : null),
    };
    const closestDisclosure = (selector) =>
      selector === 'details:not([open])' && !disclosure.open ? disclosure : null;
    view.opener.closest = closestDisclosure;
    view.opener.getClientRects = () => (disclosure.open ? [{}] : []);
    summary.closest = closestDisclosure;
    summary.contains = (element) => element === summary;
    summary.getClientRects = () => [{}];
    disclosure.open = false;
    view.document.activeElement = view.option;

    if (closeWith === 'Escape')
      view.listeners.get('keydown')({ key: 'Escape', stopPropagation() {} });
    else view.ui.button('Done').props.onClick();

    assert.equal(view.document.activeElement, summary, closeWith);
    assert.equal(summary.focused, 1, closeWith);
    assert.equal(view.opener.focused, 0, 'the hidden control cannot receive focus');
    assert.equal(view.closes, 1, closeWith);
  }
});

test('focus recovery skips hidden expanded controls for the visible equivalent', () => {
  for (const hiddenBy of ['hidden attribute', 'no layout rectangles']) {
    const view = focusFixture();
    view.opener.isConnected = false;
    view.picker.closest = (selector) =>
      hiddenBy === 'hidden attribute' && selector === '[hidden]' ? view.picker : null;
    view.picker.getClientRects = () => (hiddenBy === 'no layout rectangles' ? [] : [{}]);
    view.piece.expanded = true;
    view.piece.getClientRects = () => [{}];
    view.builder.querySelectorAll = (selector) =>
      selector.includes('aria-expanded') ? [view.picker, view.piece] : [view.piece];
    view.document.activeElement = view.option;

    view.ui.button('Done').props.onClick();

    assert.equal(view.document.activeElement, view.piece, hiddenBy);
    assert.equal(view.piece.focused, 1, hiddenBy);
    assert.equal(view.picker.focused, 0, 'the first matching hidden control is skipped');
    assert.equal(view.closes, 1, hiddenBy);
  }
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
  assert.equal(current(ui).controlLabels['subject:case'], 'Change thing ending sound');
  assert.notEqual(
    current(ui).controlLabels['subject:case'],
    current(ui).controlLabels['subject:context'],
  );
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
