import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { buildNoun, buildVerb } from '../src/features/arabic/grammar.mjs';
import {
  getWordMapModel,
  nounWordPreview,
  wordMapCurve,
  wordMapTrayCurve,
} from '../src/features/arabic/arabicWordMapModel.mjs';

const initialNoun = {
  nounId: 'bayt',
  ownerId: 'our',
  number: 'singular',
  contextId: 'this',
  definiteness: 'indefinite',
};
const nounMap = (patch = {}) => {
  const noun = { ...initialNoun, ...patch };
  const result = buildNoun(noun);
  return { noun, result, model: getWordMapModel({ mode: 'noun', noun, result }) };
};
const branch = (model, id) => model.branches.find((item) => item.id === id);

test('a word-only preview preserves the actual in, from, and saw endings', () => {
  for (const [contextId, arabic, latin, sound] of [
    ['in', 'بَيْتِنَا', 'baytinā', 'i'],
    ['from', 'بَيْتِنَا', 'baytinā', 'i'],
    ['saw', 'بَيْتَنَا', 'baytanā', 'a'],
  ]) {
    const { result, model } = nounMap({ contextId });
    assert.equal(model.preview.arabic, arabic);
    assert.equal(model.preview.latin, latin);
    assert.equal(model.preview.translation, 'Our house');
    assert.equal(model.preview.arabic, result.wordArabic);
    assert.equal(branch(model, 'case').value, sound);
    assert.ok(model.preview.segments.every((piece) => piece.id !== 'context'));
    assert.equal(model.preview.segments.map((piece) => piece.arabic).join(''), arabic);
    assert.equal(result.grammar.contextId, contextId, 'the original builder state is retained');
  }
});

test('my and combined number endings remain real pieces instead of invented case vowels', () => {
  for (const [patch, arabic, sound, numberPart, meaning] of [
    [{ ownerId: 'my', contextId: 'in' }, 'بَيْتِي', 'ī', 'stem', 'My house'],
    [{ ownerId: 'my', number: 'dual' }, 'بَيْتَايَ', 'āya', 'owner', 'My two houses'],
    [
      { ownerId: 'my', number: 'dual', contextId: 'in' },
      'بَيْتَيَّ',
      'ayya',
      'owner',
      'My two houses',
    ],
    [
      { nounId: 'muallim', ownerId: 'my', number: 'plural' },
      'مُعَلِّمِيَّ',
      'iyya',
      'owner',
      'My teachers',
    ],
  ]) {
    const { model } = nounMap(patch);
    assert.equal(model.preview.arabic, arabic);
    assert.equal(model.preview.translation, meaning);
    assert.equal(branch(model, 'case').value, sound);
    assert.equal(branch(model, 'case').partId, 'owner');
    assert.equal(branch(model, 'number').partId, numberPart);
    assert.equal(
      model.preview.segments.some((piece) => piece.id === 'case'),
      false,
    );
  }
});

test('special plural endings are read from the result, including a after in', () => {
  const unspecified = nounMap({
    nounId: 'masjid',
    ownerId: 'none',
    number: 'plural',
    contextId: 'in',
  });
  assert.equal(unspecified.model.preview.arabic, 'مَسَاجِدَ');
  assert.equal(branch(unspecified.model, 'case').value, 'a');
  const definite = nounMap({
    nounId: 'masjid',
    ownerId: 'none',
    number: 'plural',
    contextId: 'in',
    definiteness: 'definite',
  });
  assert.equal(definite.model.preview.arabic, 'الْمَسَاجِدِ');
  assert.equal(branch(definite.model, 'case').value, 'i');
  assert.equal(definite.model.article.value, 'The');
  const feminine = nounMap({ nounId: 'muallimah', number: 'plural', contextId: 'saw' });
  assert.equal(branch(feminine.model, 'case').value, 'i');
  assert.equal(feminine.result.grammar.caseKey, 'a');
});

test('word previews preserve articles, plural meaning, and their original input', () => {
  const { result } = nounMap({ ownerId: 'none', number: 'dual', definiteness: 'definite' });
  const before = JSON.stringify(result);
  const preview = nounWordPreview(result);
  assert.equal(preview.translation, 'The two houses');
  assert.equal(preview.arabic, result.wordArabic);
  assert.ok(preview.segments.some((piece) => piece.id === 'article'));
  assert.equal(JSON.stringify(result), before);
});

test('action maps have only who and when branches and retain negative or future meaning', () => {
  for (const [tenseId, arabic, english, personPart] of [
    ['past', 'كَتَبْنَا', 'We wrote', 'ending'],
    ['future', 'سَنَكْتُبُ', 'We will write', 'prefix'],
    ['negative_past', 'مَا كَتَبْنَا', 'We did not write', 'ending'],
    ['negative_present', 'لَا نَكْتُبُ', 'We do not write', 'prefix'],
  ]) {
    const verb = { verbId: 'kataba', personId: 'we', tenseId };
    const result = buildVerb(verb);
    const model = getWordMapModel({ mode: 'verb', verb, result });
    assert.deepEqual(
      model.branches.map((item) => item.id),
      ['person', 'tense'],
    );
    assert.equal(model.article, undefined);
    assert.equal(model.preview.arabic, arabic);
    assert.equal(model.preview.translation, english);
    assert.equal(branch(model, 'person').partId, personPart);
    assert.equal(model.preview, result, 'the action and its time particles stay intact');
  }
});

test('connector curves face the right edges in wide and stacked layouts', () => {
  assert.equal(
    wordMapCurve(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 250, y: 125, width: 50, height: 50 },
    ),
    'M 200.0 150.0 C 225.0 150.0 225.0 150.0 250.0 150.0',
  );
  const word = { x: 60, y: 16, width: 200, height: 140 };
  const owner = { x: 16, y: 190, width: 130, height: 80 };
  const anchor = { x: 156, y: 430, width: 8, height: 8 };
  assert.match(wordMapCurve(word, owner), /^M 160\.0 156\.0 C /);
  const tray = wordMapTrayCurve(owner, anchor, 320);
  assert.match(tray, /^M 16\.0 230\.0 C 6\.0 /);
  assert.match(tray, /160\.0 434\.0$/);
  assert.equal(/NaN|Infinity/.test(tray), false);
});

const bundle = await build({
  entryPoints: [new URL('../src/features/arabic/ArabicWordMap.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'map-component-fixture',
      setup(builder) {
        builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({ path, namespace: 'empty-css' }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
      },
    },
  ],
});
const require = createRequire(import.meta.url);
const nodes = (tree) =>
  !tree || typeof tree !== 'object'
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];

function mapFixture(overrides = {}) {
  const { noun, result } = nounMap({ contextId: 'in' });
  const selected = [];
  const selectionDetails = [];
  let backs = 0,
    cursor = 0;
  const props = {
    mode: 'noun',
    noun,
    result,
    selector: 'owner',
    children: React.createElement('div', { 'data-testid': 'supplied-choices' }, 'Existing choices'),
    onSelect: (id, hint, forceOpen) => {
      selected.push(id);
      selectionDetails.push({ id, hint, forceOpen });
    },
    onBack: () => {
      backs++;
    },
    ...overrides,
  };
  const runtime = {
    ...React,
    useMemo: (callback) => callback(),
    useEffect() {},
    useRef: (value) => ({ current: value }),
    useId: () => `map-${cursor++}`,
    useState: (value) => [value, () => {}],
  };
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? runtime : require(name)),
  };
  runInNewContext(bundle.outputFiles[0].text, context);
  return {
    props,
    selected,
    selectionDetails,
    render() {
      cursor = 0;
      return context.module.exports.default(props);
    },
    get backs() {
      return backs;
    },
  };
}

test('map buttons reuse the controlled selector and expose only one supplied tray', () => {
  const ui = mapFixture();
  let tree = ui.render();
  const before = JSON.stringify(ui.props.noun);
  const buttons = nodes(tree).filter((node) => node.type === 'button');
  const open = buttons.filter((node) => node.props['aria-expanded']);
  assert.equal(open.length, 1);
  assert.match(open[0].props['aria-label'], /^Whose\?:/);
  assert.ok(nodes(tree).some((node) => node.props?.id === open[0].props['aria-controls']));
  assert.equal(
    nodes(tree).filter((node) => node.props?.['data-testid'] === 'supplied-choices').length,
    1,
  );
  buttons.find((node) => /^How many\?:/.test(node.props['aria-label'] || '')).props.onClick();
  assert.deepEqual(ui.selected, ['number']);
  assert.equal(JSON.stringify(ui.props.noun), before, 'the map never owns or resets grammar state');
  ui.props.selector = 'number';
  tree = ui.render();
  assert.equal(
    nodes(tree).filter((node) => node.type === 'button' && node.props['aria-expanded']).length,
    1,
  );
  const glyphs = nodes(tree).find((node) => node.type?.name === 'ArabicGlyphs');
  assert.equal(glyphs.props.result.arabic, 'بَيْتِنَا');
  glyphs.props.onPartClick('owner', { meaningId: 'number' });
  assert.equal(ui.selected.at(-1), 'number');
  nodes(tree)
    .find((node) => node.type === 'button' && node.props.onClick === ui.props.onBack)
    .props.onClick();
  assert.equal(ui.backs, 1);
});

test('a closed map has no hidden choice tray and verb glyphs use only valid action controls', () => {
  const ui = mapFixture({ selector: null });
  const closed = ui.render();
  assert.equal(
    nodes(closed).filter((node) => node.props?.['data-testid'] === 'supplied-choices').length,
    0,
  );
  assert.equal(nodes(closed).filter((node) => node.props?.['aria-expanded']).length, 0);
  const verb = { verbId: 'kataba', personId: 'we', tenseId: 'present' };
  const action = mapFixture({ mode: 'verb', verb, result: buildVerb(verb), selector: 'person' });
  const tree = action.render();
  const glyphs = nodes(tree).find((node) => node.type?.name === 'ArabicGlyphs');
  glyphs.props.onPartClick('case', { mark: 'damma' });
  glyphs.props.onPartClick('case', { mark: 'damma' });
  glyphs.props.onPartClick('prefix');
  assert.deepEqual(action.selected, ['tense', 'tense', 'person']);
  assert.deepEqual(
    action.selectionDetails.map((call) => call.forceOpen),
    [true, true, false],
  );
  assert.equal(
    nodes(tree).some((node) => /Ending sound|A \/ the/.test(node.props?.['aria-label'] || '')),
    false,
  );
});
