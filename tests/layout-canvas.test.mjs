import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { transformLayoutRect, moveImageCrop } from '../src/lib/layoutGestures.js';

const bundled = await build({
  entryPoints: [new URL('../src/features/displays/LayoutCanvas.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  alias: { '@': new URL('../src', import.meta.url).pathname },
  plugins: [
    {
      name: 'canvas-fixture',
      setup(builder) {
        builder.onResolve({ filter: /\.css$/ }, ({ path }) => ({ path, namespace: 'empty-css' }));
        builder.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '' }));
        builder.onResolve({ filter: /^\.\/TvFinalPreview$/ }, ({ path }) => ({
          path,
          namespace: 'preview',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'preview' }, () => ({
          contents: 'export function TvScaledPreview() { return null; }',
        }));
      },
    },
  ],
});

const original = { id: 'image', type: 'state', x: 20, y: 30, width: 40, height: 50 };
const plain = (value) => JSON.parse(JSON.stringify(value));
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function canvasFixture(extra = {}) {
  const refs = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useRef(initial) {
      const index = cursor++;
      refs[index] ||= { current: initial };
      return refs[index];
    },
  };
  const require = createRequire(import.meta.url);
  const context = {
    module: { exports: {} },
    require: (name) => (name === 'react' ? hooks : require(name)),
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  const Canvas = context.module.exports.default;
  const writes = [],
    edits = [],
    selections = [],
    captures = [];
  let checkpoints = 0;
  const props = {
    layers: [{ ...original }],
    selectedId: original.id,
    ...extra,
    onSelect(id) {
      selections.push(id);
      props.selectedId = id;
    },
    onEdit(layer) {
      edits.push(layer.id);
    },
    onCheckpoint() {
      checkpoints += 1;
    },
    onChange(layer) {
      writes.push(plain(layer));
      props.layers = props.layers.map((item) => (item.id === layer.id ? layer : item));
    },
  };
  function render() {
    cursor = 0;
    const tree = Canvas(props);
    tree.ref.current = { getBoundingClientRect: () => ({ width: 500, height: 300 }) };
    return tree;
  }
  const event = (overrides = {}) => ({
    button: 0,
    isPrimary: true,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    preventDefault() {},
    stopPropagation() {},
    currentTarget: {
      setPointerCapture(id) {
        captures.push(id);
      },
      releasePointerCapture() {},
    },
    ...overrides,
  });
  return {
    props,
    writes,
    edits,
    selections,
    captures,
    render,
    event,
    get checkpoints() {
      return checkpoints;
    },
  };
}
const item = (tree) =>
  nodes(tree).find((node) => node.props?.className?.includes('layout-layer-hit'));
const corner = (tree, name) =>
  nodes(tree).find((node) => node.props?.['aria-label'] === `Resize ${name} corner`);

test('a first tap selects without moving, saving, or creating an undo checkpoint', () => {
  const fixture = canvasFixture({ selectedId: '' });
  const target = item(fixture.render());
  target.props.onPointerDown(fixture.event());
  target.props.onPointerMove(fixture.event({ clientX: 101 }));
  target.props.onPointerUp(fixture.event());
  target.props.onClick();
  assert.deepEqual(fixture.selections, ['image']);
  assert.equal(fixture.writes.length, 0);
  assert.equal(fixture.checkpoints, 0);
  assert.equal(fixture.captures.length, 0, 'unselected items leave scrolling available');
});

test('a selected tap opens settings; finger jitter does not become a drag', () => {
  const fixture = canvasFixture();
  const target = item(fixture.render());
  target.props.onPointerDown(fixture.event());
  target.props.onPointerMove(fixture.event({ clientX: 102, clientY: 101 }));
  target.props.onPointerUp(fixture.event());
  assert.deepEqual(fixture.edits, ['image']);
  assert.equal(fixture.writes.length, 0);
  assert.equal(fixture.checkpoints, 0);
});

test('a touch drag uses percentage coordinates and creates only one undo checkpoint', () => {
  const fixture = canvasFixture();
  let target = item(fixture.render());
  target.props.onPointerDown(fixture.event());
  target.props.onPointerMove(fixture.event({ clientX: 110, clientY: 120 }));
  target = item(fixture.render());
  target.props.onPointerMove(fixture.event({ clientX: 140, clientY: 130 }));
  target.props.onPointerUp(fixture.event({ clientX: 140, clientY: 130 }));
  assert.deepEqual(fixture.writes.at(-1), { ...original, x: 28, y: 40 });
  assert.equal(fixture.checkpoints, 1);
  assert.deepEqual(fixture.edits, [], 'dragging does not reopen the settings');
});

test('each corner resizes from its own handle while keeping its opposite corner fixed', () => {
  for (const [handle, label] of [
    ['nw', 'top left'],
    ['ne', 'top right'],
    ['sw', 'bottom left'],
    ['se', 'bottom right'],
  ]) {
    const fixture = canvasFixture();
    const target = corner(fixture.render(), label);
    assert.ok(target, `${label} is available`);
    target.props.onPointerDown(fixture.event());
    target.props.onPointerMove(fixture.event({ clientX: 130, clientY: 130 }));
    target.props.onPointerUp(fixture.event());
    assert.deepEqual(fixture.writes.at(-1), {
      ...original,
      ...transformLayoutRect(original, 6, 10, handle),
    });
    assert.equal(fixture.checkpoints, 1);
  }
});

test('all resize corners stay inside the canvas and retain a usable minimum size', () => {
  for (const handle of ['nw', 'ne', 'sw', 'se']) {
    for (const dx of [-999, -7.4, 0, 8.6, 999]) {
      for (const dy of [-999, -7.4, 0, 8.6, 999]) {
        const result = transformLayoutRect(original, dx, dy, handle, false);
        assert.ok(result.x >= 0 && result.y >= 0);
        assert.ok(result.width >= 5 && result.height >= 5);
        assert.ok(result.x + result.width <= 100 && result.y + result.height <= 100);
        assert.equal(
          handle.includes('w') ? result.x + result.width : result.x,
          handle.includes('w') ? 60 : 20,
        );
        assert.equal(
          handle.includes('n') ? result.y + result.height : result.y,
          handle.includes('n') ? 80 : 30,
        );
      }
    }
  }
  assert.deepEqual(transformLayoutRect(original, 999, -999), {
    x: 60,
    y: 0,
    width: 40,
    height: 50,
  });
});

test('right-clicks and secondary pointers cannot start or take over a drag', () => {
  const fixture = canvasFixture();
  const target = item(fixture.render());
  for (const patch of [{ button: 2 }, { isPrimary: false, pointerId: 2 }]) {
    target.props.onPointerDown(fixture.event(patch));
    target.props.onPointerMove(fixture.event({ ...patch, clientX: 200 }));
    target.props.onPointerUp(fixture.event(patch));
  }
  assert.equal(fixture.writes.length, 0);
  assert.equal(fixture.checkpoints, 0);
  target.props.onPointerDown(fixture.event());
  target.props.onPointerMove(fixture.event({ pointerId: 2, isPrimary: false, clientX: 200 }));
  target.props.onPointerUp(fixture.event({ pointerId: 2, isPrimary: false }));
  target.props.onPointerCancel(fixture.event({ pointerId: 2, isPrimary: false }));
  target.props.onLostPointerCapture(fixture.event({ pointerId: 2, isPrimary: false }));
  assert.equal(fixture.writes.length, 0);
  target.props.onPointerMove(fixture.event({ clientX: 125 }));
  assert.equal(fixture.writes.length, 1, 'original pointer remains active');
});

test('pointer cancellation and lost capture stop updates without opening settings', () => {
  for (const action of ['onPointerCancel', 'onLostPointerCapture']) {
    const fixture = canvasFixture();
    const target = item(fixture.render());
    target.props.onPointerDown(fixture.event());
    target.props.onPointerMove(fixture.event({ clientX: 125 }));
    target.props[action](fixture.event());
    target.props.onPointerMove(fixture.event({ clientX: 150 }));
    target.props.onPointerUp(fixture.event());
    assert.equal(fixture.writes.length, 1);
    assert.equal(fixture.checkpoints, 1);
    assert.deepEqual(fixture.edits, []);
  }
});

test('crop dragging moves the image focal point while retaining the frame geometry', () => {
  const fixture = canvasFixture({ crop: true });
  const target = item(fixture.render());
  target.props.onPointerDown(fixture.event());
  target.props.onPointerMove(fixture.event({ clientX: 150, clientY: 70 }));
  target.props.onPointerUp(fixture.event());
  assert.deepEqual(fixture.writes.at(-1), {
    ...original,
    image_fit: 'cover',
    image_position: { x: 25, y: 70 },
  });
  assert.equal(fixture.checkpoints, 1);
  assert.deepEqual(moveImageCrop({ x: 30, y: 80 }, 1000, -1000), { x: 0, y: 100 });
});

test('disabled and hidden items cannot be manipulated on the touch surface', () => {
  const disabled = canvasFixture({ disabled: true });
  const target = item(disabled.render());
  assert.equal(target.props.disabled, true);
  target.props.onPointerDown(disabled.event());
  target.props.onPointerMove(disabled.event({ clientX: 150 }));
  assert.equal(disabled.writes.length, 0);
  const hidden = canvasFixture({ layers: [{ ...original, hidden: true }] });
  const tree = hidden.render();
  assert.equal(item(tree), undefined);
  assert.equal(corner(tree, 'top left'), undefined);
});

test('arrow keys select and move another layer even while the previous image is being cropped', () => {
  const notice = {
    id: 'notice',
    type: 'text',
    text: 'Welcome',
    x: 10,
    y: 15,
    width: 30,
    height: 20,
  };
  const fixture = canvasFixture({ crop: true, layers: [{ ...original }, notice] });
  const target = nodes(fixture.render()).find(
    (node) => node.props?.['aria-label'] === 'Select text',
  );
  target.props.onKeyDown({ key: 'ArrowRight', shiftKey: false, preventDefault() {} });
  assert.deepEqual(fixture.selections, [notice.id]);
  assert.equal(fixture.checkpoints, 1);
  assert.deepEqual(fixture.writes, [{ ...notice, x: 11 }]);
  assert.equal(fixture.writes[0].image_fit, undefined);
  assert.equal(fixture.writes[0].image_position, undefined);
  assert.deepEqual(fixture.props.layers[0], original, 'the previously selected image is unchanged');
});
