import test from 'node:test';
import assert from 'node:assert/strict';
import { pageDraft, pageUrl, pageProblem, formStatus } from '../src/lib/pageContent.js';

test('poster pages preserve supplied details without inventing registration requirements', () => {
  const poster = {id: 'open-quran-circle', title: 'Open Qur’an Circle', detail: 'All welcome', image: '/poster.png', schedule: 'Fridays'};
  const page = pageDraft(poster);
  assert.equal(page.source_poster_id, poster.id);
  assert.equal(page.image_url, poster.image);
  assert.equal(page.published, false);
  assert.equal(page.registration, 'none');
  assert.equal(page.form_id, null);
  assert.equal(pageUrl(page), '/pages/open-quran-circle');
  assert.equal(pageProblem(page), '');
});
test('moving a page between sections keeps its public address stable', () => {
  const page = pageDraft({id: 'arabic-course', title: 'Arabic course'});
  const address = pageUrl(page);
  page.placement = '/education/courses';
  assert.equal(pageUrl(page), address);
});
test('page validation rejects unsafe images, system placements and invalid titles', () => {
  const page = pageDraft({id: 'quran-course', title: 'Quran course'});
  for (const patch of [{title: ''}, {slug: '../admin'}, {image_url: 'http://example.org/a.png'}, {image_url: '//evil.org/image'}, {image_url: 'relative.png'}, {image_url: '/\\evil/image'}, {placement: '/admin'}]) {
    assert.ok(pageProblem({...page, ...patch}));
  }
});
test('form state distinguishes drafts, live forms and closed registrations', () => {
  assert.equal(formStatus({enabled: true, published_version: null}), 'Draft');
  assert.equal(formStatus({enabled: true, published_version: 1}), 'Live');
  assert.equal(formStatus({enabled: false, published_version: 1}), 'Closed');
});
