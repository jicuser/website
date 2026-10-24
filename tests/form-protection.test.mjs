import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyFormProtection,
  publicProtectionConfig,
} from '../supabase/functions/_shared/form-protection.mjs';
const request = (origin = 'https://www.jicmasjid.org') =>
  new Request('https://api.test', { method: 'POST', headers: { origin } });
const env = (key) =>
  ({ TURNSTILE_SECRET_KEY: 'private-test-key', TURNSTILE_SITE_KEY: 'public-test-key' })[key];
const good = { security: { started_at: 1000, captcha_token: 'valid-token', website: '' } };
const valid = (result) => async () => new Response(JSON.stringify(result), { status: 200 });
test('public config never includes the verification secret', () => {
  assert.deepEqual(publicProtectionConfig(env), { enabled: true, site_key: 'public-test-key' });
  assert.deepEqual(
    publicProtectionConfig(() => undefined),
    { enabled: false, site_key: '' },
  );
});
test('rejects forged tokens, missing checks, wrong sites/actions and verifier outages', async () => {
  for (const result of [
    { success: false },
    { success: true, hostname: 'attacker.test', action: 'public_form' },
    { success: true, hostname: 'jicmasjid.org', action: 'different_action' },
  ])
    await assert.rejects(
      verifyFormProtection(request(), good, { env, now: 5000, fetcher: valid(result) }),
      /expired/,
    );
  await assert.rejects(verifyFormProtection(request(), {}, { env, now: 5000 }), /complete/);
  await assert.rejects(
    verifyFormProtection(request(), good, {
      env,
      now: 5000,
      fetcher: async () => {
        throw Error('offline');
      },
    }),
    /unavailable/,
  );
});
test('valid server verification accepts apostrophes and SQL-looking answers as inert data', async () => {
  let sent;
  const body = { ...good, answers: { name: "O'Connor", request: "'; DROP TABLE profiles; --" } };
  await verifyFormProtection(request(), body, {
    env,
    now: 5000,
    fetcher: async (url, init) => {
      sent = JSON.parse(init.body);
      return new Response(
        JSON.stringify({ success: true, action: 'public_form', hostname: 'www.jicmasjid.org' }),
      );
    },
  });
  assert.deepEqual(sent, { secret: 'private-test-key', response: 'valid-token' });
  assert.equal(body.answers.name, "O'Connor");
});
test('honeypot, impossible timing and cross-site writes fail before remote verification', async () => {
  let calls = 0;
  const options = {
    env,
    now: 5000,
    fetcher: async () => {
      calls++;
    },
  };
  await assert.rejects(
    verifyFormProtection(request('https://attacker.test'), good, options),
    /JIC website/,
  );
  await assert.rejects(verifyFormProtection(request(), { website: 'spam' }, options), /accepted/);
  await assert.rejects(
    verifyFormProtection(request(), { security: { started_at: 4999 } }, options),
    /wait/,
  );
  assert.equal(calls, 0);
});
