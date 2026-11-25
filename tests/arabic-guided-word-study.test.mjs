import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { buildNoun, buildVerb } from '../src/features/arabic/grammar.mjs';
import { HARAKAT } from '../src/features/arabic/arabicGlyphModel.mjs';

const require = createRequire(import.meta.url);
const bundled = await build({
  entryPoints: [new URL('../src/features/arabic/GuidedWordStudy.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'ignore-styles',
      setup(builder) {
        builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({ path, namespace: 'empty-css' }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
      },
    },
  ],
});
const nodes = (tree) =>
  !tree || typeof tree !== 'object'
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];
const content = (tree) =>
  typeof tree === 'string' || typeof tree === 'number'
    ? String(tree)
    : !tree
      ? ''
      : Array.isArray(tree)
        ? tree.map(content).join('')
        : content(tree.props?.children);
const changed = (old, next) => !old || next.some((value, index) => !Object.is(old[index], value));
const STORAGE_KEY = 'jic.arabic.word-study.v1';
function memoryStorage(initial) {
  const values = new Map(initial == null ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

// Compile and exercise the actual JSX handlers, using the same minimal hook
// storage approach as the repository's other component fixtures.
function fixture(storage = memoryStorage()) {
  const slots = [],
    sentencePatches = [],
    references = [],
    wordChanges = [];
  let cursor = 0,
    effects = [],
    tree,
    focusRestores = 0,
    searchFocuses = 0;
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
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ||= { current: initial });
    },
    useId() {
      return `guided-fixture-${cursor++}`;
    },
    useMemo(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { deps, value: callback() };
      return slots[index].value;
    },
    useEffect(callback, deps) {
      const index = cursor++,
        old = slots[index];
      if (changed(old?.deps, deps)) {
        slots[index] = { deps };
        effects.push(() => {
          old?.cleanup?.();
          slots[index].cleanup = callback();
        });
      }
    },
  };
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? runtime : require(name)),
    localStorage: storage,
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  const Component = context.module.exports.default;
  const props = {
    onBuildSentence: (patch) => sentencePatches.push(patch),
    onOpenReference: (topic) => references.push(topic),
    onWordChange: (value) => wordChanges.push(value),
  };
  return {
    sentencePatches,
    references,
    wordChanges,
    storage,
    render() {
      cursor = 0;
      effects = [];
      tree = Component(props);
      const input = nodes(tree).find(
        (node) => node.type === 'input' && node.props.type === 'search',
      );
      if (input?.ref)
        input.ref.current = {
          focus() {
            searchFocuses += 1;
          },
        };
      effects.forEach((callback) => callback());
      return this;
    },
    button(label) {
      return nodes(tree).find(
        (node) =>
          node.type === 'button' &&
          (node.props['aria-label'] === label || content(node).trim() === label),
      );
    },
    click(label) {
      return this.activate(this.button(label));
    },
    activate(button) {
      assert.ok(button, 'the requested native control is available');
      button.props.onClick({
        currentTarget: {
          focus() {
            focusRestores += 1;
          },
        },
      });
      return this.render();
    },
    group(label) {
      return nodes(tree).find(
        (node) => node.props?.role === 'group' && node.props['aria-label'] === label,
      );
    },
    option(group, label) {
      return nodes(this.group(group)).find(
        (node) =>
          node.type === 'button' &&
          (content(node.props.children?.[0]) === label || content(node).trim() === label),
      );
    },
    search(query) {
      const input = nodes(tree).find(
        (node) => node.type === 'input' && node.props.type === 'search',
      );
      assert.ok(input);
      input.props.onChange({ target: { value: query } });
      return this.render();
    },
    glyphs() {
      return nodes(tree).find((node) => node.type?.name === 'ArabicGlyphs');
    },
    result() {
      return this.glyphs().props.result;
    },
    tapSource(sourceIndex) {
      let start = 0;
      const segment = this.result().segments.find((part) => {
        const contains = start <= sourceIndex && start + part.arabic.length > sourceIndex;
        start += part.arabic.length;
        return contains;
      });
      const character = this.result().arabic[sourceIndex];
      this.glyphs().props.onPartClick(segment.id, {
        sourceIndex,
        character,
        mark: HARAKAT[character]?.id,
      });
      return this.render();
    },
    get tree() {
      return tree;
    },
    get focusRestores() {
      return focusRestores;
    },
    get searchFocuses() {
      return searchFocuses;
    },
  };
}

function assertWord(ui, arabic, latin, translation) {
  const result = ui.result();
  assert.equal(result.arabic, arabic);
  assert.equal(result.latin, latin);
  assert.equal(result.translation, translation);
  assert.equal(
    result.arabic.trim().split(/\s+/u).length,
    1,
    'word study always shows one Arabic word',
  );
  assert.equal(
    nodes(ui.tree).filter((node) => node.type?.name === 'ArabicGlyphs').length,
    1,
    'there is one full-word canvas',
  );
}

test('standalone this/that forms preserve the chosen gender and hand off a valid sentence', () => {
  const ui = fixture().render();
  assertWord(ui, 'هَذَا', 'hādhā', 'This');
  ui.click('hādhihi: feminine');
  assertWord(ui, 'هَذِهِ', 'hādhihi', 'This');
  ui.click('That');
  assertWord(ui, 'تِلْكَ', 'tilka', 'That');
  ui.click('Open pointing table');
  assert.deepEqual(ui.references, ['pointing']);
  ui.click('Use in a sentence');
  const patch = ui.sentencePatches.at(-1);
  assert.equal(patch.mode, 'noun');
  const sentence = buildNoun(patch);
  assert.ok(sentence.arabic.startsWith('تِلْكَ '));
  assert.equal(sentence.grammar.gender, 'f');
});

test('thing choices build baytī and kitābuka; tapping nā explains without editing its sounds', () => {
  const ui = fixture().render().click('Things');
  ui.click('Whose?: No owner');
  ui.activate(ui.option('Owner choices', 'My'));
  assertWord(ui, 'بَيْتِي', 'baytī', 'My house');
  ui.click('Whose?: My');
  ui.activate(ui.option('Owner choices', 'Our'));
  assertWord(ui, 'بَيْتُنَا', 'baytunā', 'Our house');
  const before = ui.result().arabic;
  const nFatha = before.lastIndexOf('َ');
  ui.tapSource(nFatha);
  assert.equal(ui.result().arabic, before);
  const explanation = nodes(ui.tree).find((node) => node.props?.['data-guided-explanation']);
  assert.equal(explanation.props['data-focus-source-index'], nFatha);
  assert.match(content(explanation), /nā|long.*ā|fatḥa/i);
  assert.equal(
    ui.button('Close word choices'),
    undefined,
    'choosing an owner returns to the word canvas',
  );
  ui.click('Word: House').search('كتاب');
  ui.activate(ui.option('Vocabulary choices', 'Book'));
  assert.ok(ui.focusRestores > 0, 'closing the finder restores its opening control');
  ui.click('Whose?: Our').activate(ui.option('Owner choices', 'Your · one man'));
  assertWord(ui, 'كِتَابُكَ', 'kitābuka', 'Your book');
  ui.click('Use in a sentence');
  const patch = ui.sentencePatches.at(-1);
  assert.equal(patch.ownerId, 'your_m');
  assert.equal(patch.nounId, 'kitab');
  assert.ok(buildNoun(patch).arabic.includes('كِتَابُكَ'));
});

test('actions offer six common people and real single-word present/past forms', () => {
  const ui = fixture().render().click('Actions');
  assertWord(ui, 'أَكْتُبُ', 'aktubu', 'I write');
  ui.click('Past');
  assertWord(ui, 'كَتَبْتُ', 'katabtu', 'I wrote');
  ui.click('Who?: I');
  assert.equal(
    nodes(ui.group('Person choices')).filter((node) => node.type === 'button').length,
    6,
  );
  ui.activate(ui.option('Person choices', 'We'));
  assertWord(ui, 'كَتَبْنَا', 'katabnā', 'We wrote');
  ui.click('Now / usually');
  assertWord(ui, 'نَكْتُبُ', 'naktubu', 'We write');
  ui.click('Use in a sentence');
  const patch = ui.sentencePatches.at(-1);
  assert.equal(patch.mode, 'verb');
  assert.equal(buildVerb(patch).arabic, 'نَكْتُبُ');
  assert.equal(
    ui.button('Does not happen'),
    undefined,
    'two-word negative forms belong in sentence study',
  );
});

test('every source character has a native keyboard explanation and changing words clears it', () => {
  const ui = fixture().render().click('Look inside').click('Letters & vowels');
  const original = ui.result().arabic;
  const controls = nodes(ui.group('Letters and vowels in this word')).filter(
    (node) => node.type === 'button',
  );
  assert.equal(controls.length, Array.from(original).length);
  for (const control of controls) {
    ui.activate(control);
    assert.equal(ui.result().arabic, original);
    const sourceIndex = control.props['data-guided-source-index'];
    const explanation = nodes(ui.tree).find((node) => node.props?.['data-guided-explanation']);
    assert.ok(explanation, `source character ${sourceIndex} has an explanation`);
    assert.equal(explanation.props['data-focus-source-index'], sourceIndex);
  }
  ui.click('See the sounds table');
  assert.deepEqual(ui.references, ['sounds']);
  ui.click('hādhihi: feminine');
  assert.equal(
    nodes(ui.tree).some((node) => node.props?.['data-guided-explanation']),
    false,
  );
  assert.equal(ui.wordChanges.at(-1).result.arabic, 'هَذِهِ');
});

test('the word finder opens beside its control, focuses search, and Escape restores the opener', () => {
  const ui = fixture().render().click('Things').click('Word: House');
  assert.equal(ui.searchFocuses, 1);
  const list = nodes(ui.tree);
  const tray = list.find((node) => node.props?.className === 'arabic-guided-tray is-word');
  const canvas = list.find((node) => node.props?.className === 'arabic-guided-canvas');
  assert.ok(
    list.indexOf(tray) < list.indexOf(canvas),
    'vocabulary choices appear directly after the controls',
  );
  assert.equal(
    list.filter((node) => node.props?.className?.startsWith('arabic-guided-tray ')).length,
    1,
  );
  let stopped = false;
  ui.tree.props.onKeyDown({
    key: 'Escape',
    stopPropagation() {
      stopped = true;
    },
  });
  ui.render();
  assert.equal(stopped, true);
  assert.equal(ui.focusRestores, 1);
  assert.equal(ui.button('Close word choices'), undefined);
  ui.click('Look inside');
  const expanded = nodes(ui.tree);
  const inspection = expanded.find(
    (node) => node.props?.className === 'arabic-guided-tray is-inspect',
  );
  const currentCanvas = expanded.find((node) => node.props?.className === 'arabic-guided-canvas');
  assert.ok(
    expanded.indexOf(inspection) > expanded.indexOf(currentCanvas),
    'sound inspection stays beside its lower opener',
  );
});

test('word choices survive a fresh mount without saving open panels or explanations', () => {
  const storage = memoryStorage();
  const first = fixture(storage).render();
  assertWord(first, 'هَذَا', 'hādhā', 'This');
  first.click('Things').click('Word: House').search('book');
  first.activate(first.option('Vocabulary choices', 'Book'));
  first.click('Whose?: No owner').activate(first.option('Owner choices', 'Your · one man'));
  first.tapSource(first.result().arabic.length - 1);
  first.click('Look inside');
  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(saved.type, 'noun');
  assert.equal(saved.nounId, 'kitab');
  assert.equal(saved.ownerId, 'your_m');
  assert.equal('focus' in saved, false);
  assert.equal('panel' in saved, false);
  const restored = fixture(storage).render();
  assertWord(restored, 'كِتَابُكَ', 'kitābuka', 'Your book');
  assert.equal(restored.button('Close word choices'), undefined);
  assert.equal(
    nodes(restored.tree).some((node) => node.props?.['data-guided-explanation']),
    false,
  );
  assertWord(fixture().render(), 'هَذَا', 'hādhā', 'This');
});

test('corrupt storage and unknown saved IDs fall back to checked word choices', () => {
  for (const value of ['{', 'null', '[]', '42'])
    assertWord(fixture(memoryStorage(value)).render(), 'هَذَا', 'hādhā', 'This');
  const storage = memoryStorage(
    JSON.stringify({
      type: 'verb',
      verbId: 'missing',
      personId: 'missing',
      tenseId: 'negative_past',
      nounId: 'missing',
      ownerId: 'missing',
      pointingId: 'missing',
      number: 'missing',
      definiteness: 'missing',
      extra: 'not persisted',
    }),
  );
  const ui = fixture(storage).render();
  assertWord(ui, 'أَكْتُبُ', 'aktubu', 'I write');
  ui.click('Things');
  assertWord(ui, 'بَيْتٌ', 'baytun', 'A house');
  ui.click('Pointing');
  assertWord(ui, 'هَذَا', 'hādhā', 'This');
  assert.equal('extra' in JSON.parse(storage.getItem(STORAGE_KEY)), false);
});

test('unavailable or full storage never prevents selecting and explaining a word', () => {
  const blocked = {
    getItem() {
      throw new Error('Storage blocked');
    },
    setItem() {
      throw new Error('Storage full');
    },
  };
  const ui = fixture(blocked).render();
  assertWord(ui, 'هَذَا', 'hādhā', 'This');
  ui.click('Actions').click('Past');
  assertWord(ui, 'كَتَبْتُ', 'katabtu', 'I wrote');
  ui.tapSource(ui.result().arabic.length - 1);
  assert.ok(nodes(ui.tree).some((node) => node.props?.['data-guided-explanation']));
});
