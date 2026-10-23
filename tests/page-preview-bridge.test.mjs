import test from 'node:test';
import assert from 'node:assert/strict';
import { installPagePreviewBridge, sanitizePreviewPage } from '../src/lib/pagePreviewBridge.js';

test('added-page previews bound public fields and discard private or unsafe values', () => {
  const page = sanitizePreviewPage({
    slug: '../admin',
    title: 'A'.repeat(200),
    body: 'B'.repeat(14000),
    schedule: 'C'.repeat(500),
    image_url: 'javascript:alert(1)',
    placement: '/admin',
    kind: 'course',
    registration: 'interest',
    published: 'true',
    created_by: 'private-person',
    form: {
      slug: 'course-interest',
      open: true,
      schema: { private: true },
      responses: ['private-response'],
    },
  });
  assert.equal(page.title.length, 160);
  assert.equal(page.body.length, 12000);
  assert.equal(page.schedule.length, 400);
  assert.equal(page.image_url, '');
  assert.equal(page.placement, '/education');
  assert.equal(page.slug, 'draft-page');
  assert.equal(page.published, false);
  assert.deepEqual(page.form, { slug: 'course-interest', open: true });
  assert.ok(!JSON.stringify(page).includes('private-'));
  assert.equal(sanitizePreviewPage(null), null);
  assert.equal(sanitizePreviewPage([]), null);
  for (const image_url of [
    '//elsewhere.test/a.jpg',
    'https://user:pass@example.test/a.jpg',
    'data:image/svg+xml,hello',
  ])
    assert.equal(sanitizePreviewPage({ image_url }).image_url, '');
  assert.equal(
    sanitizePreviewPage({ image_url: '/posters/course.jpg' }).image_url,
    '/posters/course.jpg',
  );
});

test('draft messages require the preview iframe, its actual path and its same-origin parent', () => {
  const previous = globalThis.window;
  const listeners = new Map(),
    updates = [],
    events = [];
  const parent = { postMessage() {} };
  const browser = {
    parent,
    location: { pathname: '/pages/__draft', search: '?preview=1', origin: 'https://site.test' },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    dispatchEvent: (event) => events.push(event.type),
  };
  globalThis.window = browser;
  try {
    const stop = installPagePreviewBridge((content) => updates.push(content));
    const valid = {
      origin: 'https://site.test',
      source: parent,
      data: {
        type: 'jic-page-preview',
        path: '/pages/__draft',
        content: {},
        sections: null,
        page: { title: 'Unsaved page', body: 'Draft content', published: false },
      },
    };
    const receive = listeners.get('message');
    receive({ ...valid, origin: 'https://other.test' });
    receive({ ...valid, source: {} });
    receive({ ...valid, data: { ...valid.data, path: '/pages/another' } });
    assert.equal(browser.__jicPagePreview, undefined);
    receive(valid);
    assert.equal(browser.__jicPagePreview.page.title, 'Unsaved page');
    assert.equal(browser.__jicPagePreview.page.published, false);
    assert.deepEqual(events, ['jic-page-preview']);
    assert.deepEqual(updates, [{}]);
    stop();
    assert.equal(browser.__jicPagePreview, undefined);
    browser.parent = browser;
    installPagePreviewBridge(() => assert.fail('Standalone pages must not accept previews'));
    assert.equal(listeners.size, 0);
  } finally {
    globalThis.window = previous;
  }
});
