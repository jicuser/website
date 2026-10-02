import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageUploader, validateImageContents } from '../src/lib/imageUpload.js';

const png = () =>
  new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });

test('image signatures must match their declared type', async () => {
  assert.equal(await validateImageContents(png()), 'png');
  assert.equal(
    await validateImageContents(
      new Blob([new Uint8Array([255, 216, 255])], { type: 'image/jpeg' }),
    ),
    'jpg',
  );
  assert.equal(
    await validateImageContents(new Blob(['RIFF0000WEBP'], { type: 'image/webp' })),
    'webp',
  );
  await assert.rejects(
    validateImageContents(new Blob(['<script>bad</script>'], { type: 'image/png' })),
    /contents/,
  );
  await assert.rejects(
    validateImageContents(new Blob(['<svg/>'], { type: 'image/svg+xml' })),
    /JPG/,
  );
  await assert.rejects(
    validateImageContents(new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: 'image/png' })),
    /8 MB/,
  );
});

test('invalid uploads and folder traversal fail before reaching storage', async () => {
  const upload = createImageUploader({
    storage: {
      from() {
        assert.fail('storage must not be reached');
      },
    },
  });
  await assert.rejects(upload(new Blob(['bad'], { type: 'image/png' })), /contents/);
  for (const folder of ['../outside', '/root', 'a//b', 'a/../b', '', 'a\\b']) {
    await assert.rejects(upload(png(), folder), /folder/);
  }
});

test('uploader uses the injected bucket, unique paths and explicit non-overwrite options', async () => {
  const uploads = [];
  const client = {
    storage: {
      from(bucket) {
        assert.equal(bucket, 'another-project');
        return {
          async upload(path, file, options) {
            uploads.push({ path, file, options });
            return { error: null };
          },
          getPublicUrl(path) {
            return { data: { publicUrl: `https://example.com/${path}` } };
          },
        };
      },
    },
  };
  const upload = createImageUploader(client, 'another-project');
  const file = png();
  const url = await upload(file, 'sections/home/gallery');
  await upload(file, 'sections/home/gallery');
  assert.match(url, /^https:\/\/example.com\/sections\/home\/gallery\/[a-f0-9-]+\.png$/);
  assert.notEqual(uploads[0].path, uploads[1].path);
  assert.deepEqual(uploads[0].options, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: false,
  });
});

test('storage failures are surfaced instead of returning a successful URL', async () => {
  const failure = new Error('Upload denied');
  const upload = createImageUploader({
    storage: {
      from() {
        return {
          async upload() {
            return { error: failure };
          },
          getPublicUrl() {
            assert.fail('must not return a URL after failure');
          },
        };
      },
    },
  });
  await assert.rejects(upload(png()), failure);
});
