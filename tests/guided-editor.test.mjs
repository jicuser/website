import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';

const bundle = await build({
  entryPoints: [new URL('../src/components/admin/GuidedEditor.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  loader: { '.css': 'empty' },
  alias: { '@': new URL('../src', import.meta.url).pathname },
});
const require = createRequire(import.meta.url);
const panels = ['Details', 'Questions', 'Review'].map((title) =>
  React.createElement(
    'section',
    {
      key: title,
      'data-step': title,
    },
    React.createElement('input', { defaultValue: `${title} draft` }),
  ),
);
function harness(disabled = false) {
  let selected = 0;
  const focus = [];
  const root = {};
  const context = {
    module: { exports: {} },
    require: (name) =>
      name === 'react'
        ? {
            ...React,
            useId: () => 'guide',
            useRef: () => ({ current: root }),
            useState: () => [
              selected,
              (next) => {
                selected = next;
              },
            ],
          }
        : require(name),
    requestAnimationFrame: (fn) => fn(),
    document: { getElementById: (id) => ({ focus: () => focus.push(id), scrollIntoView() {} }) },
  };
  runInNewContext(bundle.outputFiles[0].text, context);
  return {
    render: () => context.module.exports.default({ children: panels, disabled }),
    focus,
    root,
  };
}
function nodes(tree, role) {
  if (!React.isValidElement(tree)) return [];
  return [
    ...(tree.props.role === role ? [tree] : []),
    ...React.Children.toArray(tree.props.children).flatMap((child) => nodes(child, role)),
  ];
}
test('switching editor steps retains every panel and draft input, hiding only inactive panels', () => {
  const h = harness();
  const before = nodes(h.render(), 'tabpanel');
  nodes(h.render(), 'tab')[1].props.onClick();
  const after = nodes(h.render(), 'tabpanel');
  assert.equal(after.length, 3);
  after.forEach((panel, index) => {
    assert.equal(panel.props.children.props.children, before[index].props.children.props.children);
    assert.equal(panel.props.hidden, index !== 1);
  });
});
test('keyboard navigation wraps and maintains a single tab stop with matching panel IDs', () => {
  const h = harness();
  nodes(h.render(), 'tab')[0].props.onKeyDown({ key: 'ArrowLeft', preventDefault() {} });
  const tabs = nodes(h.render(), 'tab');
  assert.equal(tabs[2].props['aria-selected'], true);
  assert.equal(tabs.filter((tab) => tab.props.tabIndex === 0).length, 1);
  assert.equal(h.focus.at(-1), 'guide-tab-2');
  nodes(h.render(), 'tabpanel').forEach((panel, i) => {
    assert.equal(tabs[i].props['aria-controls'], panel.props.id);
    assert.equal(panel.props['aria-labelledby'], tabs[i].props.id);
  });
  tabs[2].props.onKeyDown({ key: 'Home', preventDefault() {} });
  assert.equal(nodes(h.render(), 'tab')[0].props['aria-selected'], true);
});
test('a save in progress blocks editor step changes', () => {
  const h = harness(true);
  nodes(h.render(), 'tab')[2].props.onClick();
  assert.equal(nodes(h.render(), 'tab')[0].props['aria-selected'], true);
  assert.equal(h.focus.length, 0);
});
test('invalid required input reveals its hidden panel and receives focus', () => {
  const h = harness();
  nodes(h.render(), 'tab')[2].props.onClick();
  let focused = false;
  h.render().props.onInvalidCapture({
    target: {
      closest: () => ({ parentElement: h.root, dataset: { guidedPanel: '0' } }),
      focus: () => {
        focused = true;
      },
    },
  });
  assert.equal(nodes(h.render(), 'tabpanel')[0].props.hidden, false);
  assert.equal(focused, true);
});
