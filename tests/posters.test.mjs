import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_POSTERS,
  posterCatalogue,
  posterWindow,
  validPoster,
  posterImage,
} from '../src/lib/posters.js';

test('four posters advance by one and wrap without repeating the visible row early', () => {
  const queue = ['a', 'b', 'c', 'd', 'announcement', 'course'];
  assert.deepEqual(posterWindow(queue, 0), ['a', 'b', 'c', 'd']);
  assert.deepEqual(posterWindow(queue, 1), ['b', 'c', 'd', 'announcement']);
  assert.deepEqual(posterWindow(queue, 5), ['course', 'a', 'b', 'c']);
  assert.deepEqual(posterWindow(queue, 1, 4, true), ['b', 'c', 'd', 'announcement', 'course']);
  assert.deepEqual(posterWindow(['a'], 10, 4, true), ['a']);
  assert.deepEqual(posterWindow([], 10), []);
});
test('announcements accept plain text and optional pictures in the shared catalogue', () => {
  assert.equal(validPoster(DEFAULT_ANNOUNCEMENTS), true);
  const notice = {
    ...DEFAULT_ANNOUNCEMENTS,
    body: '<script>literal text</script>\nA second notice',
    images: ['/posters/photo.jpg'],
  };
  const [loaded] = posterCatalogue(JSON.stringify([notice]));
  assert.equal(loaded.body, notice.body);
  assert.deepEqual(loaded.images, notice.images);
  assert.deepEqual(posterCatalogue('[]'), []);
  assert.deepEqual(posterCatalogue(null), DEFAULT_POSTERS);
});
test('invalid picture schemes and oversized announcement content do not reach renderers', () => {
  for (const url of [
    'javascript:alert(1)',
    '//other.example/pic',
    'https://user:pass@example.org/pic',
    '/\\other.example/pic',
    'data:image/svg+xml,x',
  ])
    assert.equal(posterImage(url), false);
  assert.equal(validPoster({ ...DEFAULT_ANNOUNCEMENTS, body: 'x'.repeat(801) }), false);
  assert.equal(
    validPoster({ ...DEFAULT_ANNOUNCEMENTS, body: Array(11).fill('Line').join('\n') }),
    false,
  );
  assert.equal(
    validPoster({ ...DEFAULT_ANNOUNCEMENTS, images: Array(3).fill('/photo.jpg') }),
    false,
  );
  assert.deepEqual(
    posterCatalogue(
      JSON.stringify([{ ...DEFAULT_ANNOUNCEMENTS, images: ['javascript:alert(1)'] }]),
    ),
    [],
  );
  assert.equal(
    posterCatalogue(JSON.stringify([DEFAULT_ANNOUNCEMENTS, DEFAULT_ANNOUNCEMENTS])).length,
    1,
  );
});
