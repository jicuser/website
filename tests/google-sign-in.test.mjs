import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleSignInAvailable, startGoogleSignIn } from '../src/lib/googleSignIn.js';

test('provider discovery fails closed for disabled, missing and invalid settings', async () => {
  for (const settings of [{ external: { google: false } }, {}, { external: { google: 'true' } }]) {
    assert.equal(
      await googleSignInAvailable({
        url: 'https://auth.example',
        apiKey: 'public-key',
        fetchImpl: async () => Response.json(settings),
      }),
      false,
    );
  }
  assert.equal(
    await googleSignInAvailable({
      url: 'https://auth.example/',
      apiKey: 'public-key',
      fetchImpl: async (url, options) => {
        assert.equal(url, 'https://auth.example/auth/v1/settings');
        assert.equal(options.headers.apikey, 'public-key');
        assert.equal(options.cache, 'no-store');
        return Response.json({ external: { google: true } });
      },
    }),
    true,
  );
});

test('disabled or unreachable providers never start the OAuth redirect', async () => {
  let redirects = 0;
  const client = {
    auth: {
      signInWithOAuth: async () => {
        redirects++;
        return {};
      },
    },
  };
  await assert.rejects(
    startGoogleSignIn(client, async () => false, 'https://site.example/portal'),
    /not available/,
  );
  await assert.rejects(
    startGoogleSignIn(
      client,
      async () => {
        throw new Error('offline');
      },
      'https://site.example/portal',
    ),
    /offline/,
  );
  assert.equal(redirects, 0);
});

test('an enabled provider starts OAuth with the account return URL and propagates SDK errors', async () => {
  const redirectTo = 'https://site.example/portal';
  await startGoogleSignIn(
    {
      auth: {
        signInWithOAuth: async (options) => {
          assert.deepEqual(options, { provider: 'google', options: { redirectTo } });
          return {};
        },
      },
    },
    async () => true,
    redirectTo,
  );
  await assert.rejects(
    startGoogleSignIn(
      { auth: { signInWithOAuth: async () => ({ error: new Error('Unable to connect') }) } },
      async () => true,
      redirectTo,
    ),
    /Unable to connect/,
  );
  await assert.rejects(
    googleSignInAvailable({
      url: 'https://auth.example',
      apiKey: 'public-key',
      fetchImpl: async () => new Response('', { status: 503 }),
    }),
    /use email/,
  );
});
