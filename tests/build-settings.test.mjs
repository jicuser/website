import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBuildSettings } from '../scripts/build-settings.mjs';

const jwt = (payload) => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test`;
const valid = {
  VITE_SUPABASE_URL: 'https://release-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: jwt({ role: 'anon', ref: 'release-test' }),
};

test('release accepts a matching public key and both deliberate workspace states', () => {
  for (const flag of [undefined, '', 'true', 'false'])
    assert.doesNotThrow(() => validateBuildSettings({ ...valid, VITE_ENABLE_WORKSPACE: flag }));
  assert.doesNotThrow(() =>
    validateBuildSettings({ ...valid, VITE_SUPABASE_ANON_KEY: 'sb_publishable_public-test' }),
  );
});

test('release fails for missing, wrong-project and privileged browser keys without printing them', () => {
  assert.throws(() => validateBuildSettings({}), /Set VITE_SUPABASE_URL/);
  for (const key of [
    '',
    'your-anon-key',
    'sb_publishable_',
    jwt({ role: 'anon', ref: 'elsewhere' }),
    jwt({ role: 'anon', exp: 1 }),
  ])
    assert.throws(() => validateBuildSettings({ ...valid, VITE_SUPABASE_ANON_KEY: key }));
  for (const key of ['sb_secret_super-private', jwt({ role: 'service_role' })])
    assert.throws(
      () => validateBuildSettings({ ...valid, VITE_EXTRA: key }),
      (error) => {
        assert.match(error.message, /server-only/);
        assert.ok(!error.message.includes(key));
        return true;
      },
    );
});

test('release rejects non-HTTPS, credential-bearing, placeholder and path-based origins', () => {
  for (const url of [
    'http://release-test.supabase.co',
    'https://user:pass@release-test.supabase.co',
    'https://your-project.supabase.co',
    'https://release-test.supabase.co/path',
    'https://release-test.supabase.co/?key=x',
    'https://localhost',
  ])
    assert.throws(() => validateBuildSettings({ ...valid, VITE_SUPABASE_URL: url }));
  assert.throws(
    () => validateBuildSettings({ ...valid, VITE_ENABLE_WORKSPACE: '1' }),
    /true or false/,
  );
});
