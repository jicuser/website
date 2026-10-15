// Auth settings are public. Check the live provider before leaving the website:
// signInWithOAuth only constructs a redirect and cannot catch a disabled provider.
export async function googleSignInAvailable({ url, apiKey, fetchImpl = globalThis.fetch, signal }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: { apikey: apiKey },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
      : AbortSignal.timeout(5000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Sign-in options could not be checked. Please use email.');
  const settings = await response.json();
  return settings?.external?.google === true;
}

export async function startGoogleSignIn(client, available, redirectTo) {
  if (!(await available())) {
    throw new Error(
      'Google sign-in is not available. Please sign in with your email and password.',
    );
  }
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}
