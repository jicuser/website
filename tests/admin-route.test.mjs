import test from 'node:test';
import assert from 'node:assert/strict';
import { adminScrollKey } from '../src/lib/adminRoute.js';

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
  assert.equal(destination, adminScrollKey('/admin', '?section=forms&form=course&tab=responses&status=done&q=Ali'));
  assert.equal(destination, adminScrollKey('/admin/', '?section=forms&form=course&tab=responses'));
});

test('public-page query updates and admin login do not trigger admin scroll resets', () => {
  for (const path of ['/prayer-times', '/search', '/', '/admin/login']) {
    assert.equal(adminScrollKey(path, '?section=forms&tab=responses'), '');
  }
});
