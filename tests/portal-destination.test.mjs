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
    'https://jic.test',
  );
  assert.equal(login.searchParams.get('next'), '/account/certificates?request=course');
  const options = magicLinkOptions(
    'parent@example.test',
    'https://jic.test',
    '/account/certificates?request=nikah',
  );
  assert.equal(
    new URL(options.options.emailRedirectTo).searchParams.get('next'),
    '/account/certificates?request=nikah',
  );
  assert.equal(options.options.shouldCreateUser, false);
});
