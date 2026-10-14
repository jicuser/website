import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newPageBlock,
  movePageBlock,
  blockPayload,
  blockBaseline,
  blocksChanged,
  pageBlocksProblem,
  preparePageBlocks,
} from '../src/lib/pageBlocks.js';

const saved = (id, patch = {}) => ({
  ...newPageBlock('/about', id),
  isNew: false,
  title: `Block ${id}`,
  updated_at: '2026-10-14T12:00:00Z',
  ...patch,
});

test('new blocks are hidden and explicitly identified as new until saved', () => {
  const row = newPageBlock('/about', 'local-id');
  assert.equal(row.published, false);
  assert.equal(blockPayload(row).id, null);
  assert.equal(blocksChanged([row], []), true);
});

test('reordering preserves every draft and leaves the previous version intact for undo', () => {
  const rows = [saved('a', { body: 'Unsaved text' }), saved('b'), saved('c')];
  const moved = movePageBlock(rows, 'a', 2);
  assert.deepEqual(
    moved.map((row) => row.id),
    ['b', 'c', 'a'],
  );
  assert.equal(moved[2].body, 'Unsaved text');
  assert.deepEqual(
    rows.map((row) => row.id),
    ['a', 'b', 'c'],
  );
  assert.equal(movePageBlock(rows, 'missing', 1), rows);
  assert.equal(movePageBlock(rows, 'a', -1), rows);
  assert.equal(movePageBlock(rows, 'a', rows.length), rows);
  assert.equal(movePageBlock(rows, 'a', 0), rows);
});

test('dirty detection includes visibility, moves, deletion, order and pending images', () => {
  const rows = [saved('a'), saved('b')];
  assert.equal(blocksChanged(rows, rows), false);
  assert.equal(
    blocksChanged(
      rows.map((row) => ({ ...row })),
      rows,
    ),
    false,
  );
  for (const patch of [
    { published: true },
    { page_path: '/education' },
    { backgroundFile: {} },
    { galleryFiles: [{}] },
  ]) {
    assert.equal(blocksChanged([{ ...rows[0], ...patch }, rows[1]], rows), true);
  }
  assert.equal(blocksChanged(rows.slice(1), rows), true);
  assert.equal(blocksChanged([...rows].reverse(), rows), true);
});

test('snapshot includes only IDs and server revisions; payload strips local state', () => {
  const rows = [saved('a', { backgroundFile: {}, galleryFiles: [] })];
  assert.deepEqual(blockBaseline(rows), [{ id: 'a', updated_at: '2026-10-14T12:00:00Z' }]);
  assert.equal(Object.hasOwn(blockPayload(rows[0]), 'backgroundFile'), false);
  assert.equal(Object.hasOwn(blockPayload(rows[0]), 'updated_at'), false);
});

test('blocks reject invalid destinations, unsafe images and oversized content before upload', () => {
  assert.equal(pageBlocksProblem([saved('a')]), '');
  for (const patch of [
    { title: '' },
    { title: 'a'.repeat(161) },
    { body: 'a'.repeat(12001) },
    { page_path: '/admin' },
    { page_path: '//evil.test' },
    { background_image_url: 'javascript:alert(1)' },
    { background_image_url: 'https://user:password@host.test/a' },
    { image_urls: ['//evil.test/a'] },
    { image_urls: ['/\\evil.test/a'] },
    { image_urls: Array(13).fill('/picture.png') },
    { image_urls: {}, galleryFiles: [] },
  ])
    assert.ok(pageBlocksProblem([saved('a', patch)]), JSON.stringify(patch));
  assert.equal(
    pageBlocksProblem([saved('a', { image_urls: ['/picture.png', 'https://images.test/a.webp'] })]),
    '',
  );
  assert.ok(pageBlocksProblem(Array(61).fill(saved('a'))));
});

test('failed upload retries reuse completed images without mutating the draft', async () => {
  const background = { name: 'background' };
  const gallery = { name: 'gallery' };
  const row = saved('a', {
    backgroundFile: background,
    galleryFiles: [gallery],
    image_urls: ['/old.png'],
  });
  const uploaded = new Map();
  const calls = [];
  let fail = true;
  const upload = async (file, folder) => {
    calls.push([file.name, folder]);
    if (file === gallery && fail) throw new Error('Upload interrupted');
    return `https://images.test/${file.name}.png`;
  };
  await assert.rejects(preparePageBlocks([row], upload, uploaded), /interrupted/);
  fail = false;
  const [prepared] = await preparePageBlocks([row], upload, uploaded);
  assert.deepEqual(
    calls.map(([name]) => name),
    ['background', 'gallery', 'gallery'],
  );
  assert.equal(prepared.background_image_url, 'https://images.test/background.png');
  assert.deepEqual(prepared.image_urls, ['/old.png', 'https://images.test/gallery.png']);
  assert.deepEqual(row.image_urls, ['/old.png']);
  assert.equal(row.background_image_url, '');
});
