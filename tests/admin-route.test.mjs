import test from 'node:test';
import assert from 'node:assert/strict';
import { adminScrollKey, contactInboxDestination } from '../src/lib/adminRoute.js';

test('old contact inbox bookmarks open the Contact Us responses inside Forms', () => {
  const result = new URL(
    contactInboxDestination('?section=messages&form=old&tab=actions&status=new'),
    'https://example.test',
  );
  assert.equal(result.pathname, '/admin');
  assert.equal(result.searchParams.get('section'), 'forms');
  assert.equal(result.searchParams.get('view'), 'responses');
  assert.equal(result.searchParams.get('kind'), 'contact');
  assert.equal(result.searchParams.get('status'), 'new');
  assert.equal(result.searchParams.has('form'), false);
  assert.equal(result.searchParams.has('tab'), false);
  for (const query of ['', '?section=forms', '?section=dashboard'])
    assert.equal(contactInboxDestination(query), null);
});

test('moving between admin destinations resets the scroll key', () => {
  const forms = adminScrollKey('/admin', '?section=forms');
  const form = adminScrollKey('/admin', '?section=forms&form=course');
  const responses = adminScrollKey('/admin', '?section=forms&form=course&tab=responses');
  assert.notEqual(forms, adminScrollKey('/admin', '?section=content'));
  assert.notEqual(forms, form);
  assert.notEqual(form, responses);
  assert.notEqual(responses, adminScrollKey('/admin', '?section=forms&form=course&tab=actions'));
});

test('reordering query parameters and changing filters keep admin scroll position', () => {
  const destination = adminScrollKey('/admin', '?section=forms&form=course&tab=responses');
  assert.equal(destination, adminScrollKey('/admin', '?tab=responses&form=course&section=forms'));
  assert.equal(
    destination,
    adminScrollKey('/admin', '?section=forms&form=course&tab=responses&status=done&q=Ali'),
  );
  assert.equal(destination, adminScrollKey('/admin/', '?section=forms&form=course&tab=responses'));
});

test('public-page query updates and admin login do not trigger admin scroll resets', () => {
  for (const path of ['/prayer-times', '/search', '/', '/admin/login']) {
    assert.equal(adminScrollKey(path, '?section=forms&tab=responses'), '');
  }
});
