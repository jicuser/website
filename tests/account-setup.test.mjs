import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordError } from '../src/lib/accountSetup.js';
import { accountSetupUrl } from '../supabase/functions/manage-user/site-url.mjs';

test('invitation and recovery destination is the JIC setup page', () => {
  assert.equal(
    accountSetupUrl(),
    'https://lawngreen-kangaroo-881113.hostingersite.com/admin/setup',
  );
  assert.equal(accountSetupUrl('https://example.org'), 'https://example.org/admin/setup');
});

test('email destination rejects insecure, credential-bearing and malformed site configuration', () => {
  for (const url of [
    'http://example.org',
    '//example.org',
    'https://user:secret@example.org',
    'https://example.org?next=evil',
    'https://example.org/#token',
    'https://example.org/another-app',
    'javascript:alert(1)',
  ])
    assert.throws(() => accountSetupUrl(url));
});

test('setup requires a long matching password and preserves spaces', () => {
  assert.match(passwordError('short', 'short'), /12 characters/);
  assert.match(passwordError('a long passphrase', 'different passphrase'), /do not match/);
  assert.equal(passwordError('a long passphrase ', 'a long passphrase '), '');
  assert.match(passwordError('a long passphrase ', 'a long passphrase'), /do not match/);
});
