// Shared by public write endpoints. CAPTCHA is verified by the server, never trusted from UI.
export class ProtectionError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function publicProtectionConfig(env) {
  const configured = Boolean(env('TURNSTILE_SECRET_KEY'));
  return { enabled: configured, site_key: configured ? (env('TURNSTILE_SITE_KEY') || '') : '' };
}
export async function verifyFormProtection(req, body, { env, fetcher = fetch, now = Date.now() }) {
  const origin = req.headers.get('origin');
  const allowed = (env('FORM_ALLOWED_ORIGINS') || 'https://jicmasjid.org,https://www.jicmasjid.org').split(',').map(x => x.trim()).filter(Boolean);
  if (origin && !allowed.includes(origin)) throw new ProtectionError('Please send your request from the JIC website.', 403);
  const security = body?.security;
  if (body?.website || security?.website) throw new ProtectionError('Your request could not be accepted.', 400);
  // Timing and honeypots deter basic spam; they are not substitutes for CAPTCHA or rate limits.
  if (security?.started_at != null && (!Number.isFinite(security.started_at) || now - security.started_at < 1200 || security.started_at > now))
    throw new ProtectionError('Please wait a moment, then try again.');
  const secret = env('TURNSTILE_SECRET_KEY');
  if (!secret) return;
  const token = security?.captcha_token;
  if (typeof token !== 'string' || !token || token.length > 2048)
    throw new ProtectionError('Please complete the security check.', 403);
  let result;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Verification unavailable');
    result = await response.json();
  } catch { throw new ProtectionError('The security check is unavailable. Please try again.', 503); }
  const hosts = allowed.map(value => { try { return new URL(value).hostname; } catch { return ''; } });
  if (!result.success || result.action !== 'public_form' || !hosts.includes(result.hostname))
    throw new ProtectionError('The security check expired. Please try again.', 403);
}
