import test from 'node:test';
import assert from 'node:assert/strict';
import { portalDestination, portalLoginHref } from '../src/lib/portalDestination.js';
import { magicLinkOptions } from '../src/features/portal/model.js';

test('certificate sign-in restores only an allowlisted local destination', () => {
  assert.equal(
    portalDestination('/account/certificates?request=nikah&secret=discard'),
    '/account/certificates?request=nikah',
  );
  for (const value of [
    'https://evil.test/account/certificates',
    '//evil.test/account/certificates',
    '/admin',
    'javascript:alert(1)',
    '/account/certificates/other',
    null,
  ])
    assert.equal(portalDestination(value), '');
  assert.equal(portalDestination('/account/certificates?request=unknown'), '/account/certificates');
  const login = new URL(
    portalLoginHref('/account/certificates?request=course'),
    'https://jicmasjid.org',
  );
  assert.equal(login.searchParams.get('next'), '/account/certificates?request=course');
  const options = magicLinkOptions(
    'parent@example.test',
    'https://jicmasjid.org',
    '/account/certificates?request=nikah',
  );
  assert.equal(
    new URL(options.options.emailRedirectTo).searchParams.get('next'),
    '/account/certificates?request=nikah',
  );
  assert.equal(options.options.shouldCreateUser, false);
});

test('email links reject external return origins even when the local destination is allowlisted', () => {
  for (const origin of [
    'https://unapproved.example',
    'https://jicmasjid.org.evil.test',
    'http://jicmasjid.org',
    'https://user:secret@jicmasjid.org',
  ])
    assert.throws(() =>
      magicLinkOptions('parent@example.test', origin, '/account/certificates?request=nikah'),
    );
});
