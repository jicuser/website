import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { validateBuildSettings } from './build-settings.mjs';
import { accountReturnOrigin } from '../src/features/account/config.js';

/** Read-only public discovery. An enabled provider does not prove its credentials work. */
export async function accountReadiness(
  env,
  { fetchImpl = globalThis.fetch, offline = false } = {},
) {
  const result = {
    publicConfiguration: 'invalid',
    accountReturns: 'invalid',
    publicAuthSettings: 'not_checked',
    googleProvider: 'unknown',
    emailProvider: 'unknown',
    oauthCredentials: 'manual_verification_required',
    smtpDelivery: 'manual_verification_required',
    hostedRedirectAllowlist: 'manual_verification_required',
    hostedEmailTemplates: 'manual_verification_required',
  };
  try {
    validateBuildSettings(env);
    result.publicConfiguration = 'valid';
  } catch {
    /* Report status only; never print settings or errors. */
  }
  try {
    accountReturnOrigin(undefined, env);
    result.accountReturns = 'valid';
  } catch {
    /* Report status only. */
  }
  if (offline || result.publicConfiguration !== 'valid' || result.accountReturns !== 'valid')
    return result;
  try {
    const response = await fetchImpl(
      `${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/auth/v1/settings`,
      {
        method: 'GET',
        headers: { apikey: env.VITE_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error('Unavailable');
    const settings = await response.json();
    if (!settings || typeof settings !== 'object' || Array.isArray(settings))
      throw new Error('Invalid settings');
    result.publicAuthSettings = 'reachable';
    for (const [provider, field] of [
      ['google', 'googleProvider'],
      ['email', 'emailProvider'],
    ]) {
      const enabled = settings.external?.[provider];
      result[field] = enabled === true ? 'enabled' : enabled === false ? 'disabled' : 'unknown';
    }
  } catch {
    result.publicAuthSettings = 'unavailable';
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
  const result = await accountReadiness(env, { offline: process.argv.includes('--offline') });
  console.log(JSON.stringify(result, null, 2));
  if (
    result.publicConfiguration !== 'valid' ||
    result.accountReturns !== 'valid' ||
    result.publicAuthSettings === 'unavailable'
  )
    process.exitCode = 1;
}
