import test from 'node:test';
import assert from 'node:assert/strict';
import { accountReturnOrigin, accountReturnUrl } from '../src/features/account/config.js';
import { accountReadiness } from '../scripts/account-readiness.mjs';

const production = 'https://jicmasjid.org';
const preview = 'https://jic-approved-preview.example';
const development = { DEV: true };

test('account returns use the intended production origin and fixed account routes', () => {
  assert.equal(accountReturnOrigin(), production);
  assert.equal(accountReturnOrigin(production), production);
  assert.equal(accountReturnOrigin(`${production}/`), production);
  assert.equal(accountReturnUrl('/portal', production), `${production}/portal`);
  assert.equal(accountReturnUrl('/admin/setup', production), `${production}/admin/setup`);
  assert.throws(() => accountReturnUrl('//external.example', production));
  assert.throws(() => accountReturnUrl('/admin', production));
});

test('the exact www production alias returns to the canonical apex origin', () => {
  const alias = 'https://www.jicmasjid.org';
  assert.equal(accountReturnOrigin(alias), production);
  assert.equal(accountReturnOrigin(`${alias}/`), production);
  assert.equal(accountReturnUrl('/portal', alias), `${production}/portal`);
  assert.equal(accountReturnUrl('/admin/setup', alias), `${production}/admin/setup`);
  assert.equal(accountReturnOrigin(production, { VITE_ACCOUNT_RETURN_ORIGIN: alias }), production);
  assert.equal(accountReturnOrigin(alias, { VITE_ACCOUNT_RETURN_ORIGIN: alias }), production);
  assert.equal(accountReturnOrigin(undefined, { VITE_ACCOUNT_RETURN_ORIGIN: `${alias}/` }), production);
  for (const origin of [
    'https://other.jicmasjid.org',
    'https://evilwww.jicmasjid.org',
    'https://www.jicmasjid.org.evil.test',
    'https://www.jicmasjid.org:444',
    'http://www.jicmasjid.org',
  ]) {
    assert.throws(() => accountReturnOrigin(origin));
    assert.throws(() => accountReturnOrigin(production, { VITE_ACCOUNT_RETURN_ORIGIN: origin }));
  }
});

test('only loopback development may use local HTTP origins', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:4319', 'http://[::1]:3000']) {
    assert.equal(accountReturnOrigin(origin, development), origin);
    assert.throws(() => accountReturnOrigin(origin, { DEV: false }));
  }
  for (const origin of [
    'http://192.168.0.2:3000',
    'http://localhost.evil.test',
    'http://0.0.0.0:3000',
  ])
    assert.throws(() => accountReturnOrigin(origin, development));
});

test('a preview must be explicitly approved as one exact HTTPS origin', () => {
  assert.throws(() => accountReturnOrigin(preview));
  assert.equal(accountReturnOrigin(preview, { VITE_ACCOUNT_PREVIEW_ORIGIN: preview }), preview);
  assert.equal(
    accountReturnOrigin(preview, {
      VITE_ACCOUNT_RETURN_ORIGIN: production,
      VITE_ACCOUNT_PREVIEW_ORIGIN: preview,
    }),
    production,
  );
  assert.throws(() =>
    accountReturnOrigin(`${preview}.evil.test`, { VITE_ACCOUNT_PREVIEW_ORIGIN: preview }),
  );
  assert.throws(() => accountReturnOrigin(production, { VITE_ACCOUNT_RETURN_ORIGIN: preview }));
  for (const origin of [
    'https://*.example',
    'http://preview.example',
    'https://preview.example/app',
  ])
    assert.throws(() => accountReturnOrigin(production, { VITE_ACCOUNT_PREVIEW_ORIGIN: origin }));
});

test('malformed, external and credential-bearing account overrides fail without leaking their values', () => {
  for (const origin of [
    'https://external.example',
    'https://jicmasjid.org.evil.test',
    'http://jicmasjid.org',
    '//jicmasjid.org',
    'https://user:private-value@jicmasjid.org',
    'https://jicmasjid.org/path',
    'https://jicmasjid.org/path/..',
    'https://jicmasjid.org?key=private-value',
    'https://jicmasjid.org/#private-value',
    'https://jicmasjid.org\\evil',
    ' https://jicmasjid.org',
    'https://jicmasjid.org\n',
    'javascript:alert(1)',
    'sb_secret_private-value',
  ]) {
    assert.throws(() => accountReturnOrigin(origin));
    assert.throws(
      () => accountReturnOrigin(production, { VITE_ACCOUNT_RETURN_ORIGIN: origin }),
      (error) => !error.message.includes(origin) && !error.message.includes('private-value'),
    );
  }
});

const validEnv = {
  VITE_SUPABASE_URL: 'https://readiness-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_readiness_test',
};

test('readiness makes only a public settings GET and distinguishes visibility from credential readiness', async () => {
  const result = await accountReadiness(validEnv, {
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://readiness-test.supabase.co/auth/v1/settings');
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.apikey, validEnv.VITE_SUPABASE_ANON_KEY);
      return Response.json({ external: { google: true, email: true }, secret: 'never-print-this' });
    },
  });
  assert.equal(result.publicConfiguration, 'valid');
  assert.equal(result.accountReturns, 'valid');
  assert.equal(result.publicAuthSettings, 'reachable');
  assert.equal(result.googleProvider, 'enabled');
  assert.equal(result.emailProvider, 'enabled');
  assert.equal(result.oauthCredentials, 'manual_verification_required');
  assert.equal(result.smtpDelivery, 'manual_verification_required');
  assert.equal(result.hostedRedirectAllowlist, 'manual_verification_required');
  assert.equal(result.hostedEmailTemplates, 'manual_verification_required');
  assert.ok(!JSON.stringify(result).includes('never-print-this'));
  assert.ok(!JSON.stringify(result).includes(validEnv.VITE_SUPABASE_ANON_KEY));
});

test('readiness fails closed for disabled, malformed and unavailable provider settings', async () => {
  const disabled = await accountReadiness(validEnv, {
    fetchImpl: async () => Response.json({ external: { google: false, email: 'true' } }),
  });
  assert.equal(disabled.googleProvider, 'disabled');
  assert.equal(disabled.emailProvider, 'unknown');
  for (const fetchImpl of [
    async () => new Response('', { status: 503 }),
    async () => {
      throw new Error('private-network-error');
    },
    async () => new Response('invalid json'),
  ]) {
    const result = await accountReadiness(validEnv, { fetchImpl });
    assert.equal(result.publicAuthSettings, 'unavailable');
    assert.equal(result.googleProvider, 'unknown');
    assert.ok(!JSON.stringify(result).includes('private-network-error'));
  }
});

test('readiness never sends privileged or invalid browser configuration to a server', async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests++;
    return Response.json({});
  };
  const jwt = (role) => `e30.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.test`;
  for (const key of ['sb_secret_private-value', jwt('service_role')]) {
    const result = await accountReadiness(
      { ...validEnv, VITE_SUPABASE_ANON_KEY: key },
      { fetchImpl },
    );
    assert.equal(result.publicConfiguration, 'invalid');
    assert.equal(result.publicAuthSettings, 'not_checked');
    assert.ok(!JSON.stringify(result).includes(key));
  }
  const badOrigin = await accountReadiness(
    { ...validEnv, VITE_ACCOUNT_RETURN_ORIGIN: 'https://external.example' },
    { fetchImpl },
  );
  assert.equal(badOrigin.accountReturns, 'invalid');
  assert.equal(badOrigin.publicAuthSettings, 'not_checked');
  const offline = await accountReadiness(validEnv, { fetchImpl, offline: true });
  assert.equal(offline.publicAuthSettings, 'not_checked');
  assert.equal(requests, 0);
});
