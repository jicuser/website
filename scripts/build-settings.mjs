function jwtPayload(value) {
  if (typeof value !== 'string' || value.split('.').length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Browser configuration is public. Fail before emitting an unusable or privileged bundle.
export function validateBuildSettings(env) {
  for (const [name, value] of Object.entries(env)) {
    if (
      name.startsWith('VITE_') &&
      (String(value).startsWith('sb_secret_') || jwtPayload(value)?.role === 'service_role')
    )
      throw new Error(`${name} contains a server-only key. Remove it from the browser build.`);
  }

  let url;
  try {
    url = new URL(env.VITE_SUPABASE_URL);
  } catch {
    throw new Error('Set VITE_SUPABASE_URL to your HTTPS Supabase project origin before building.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    ['localhost', '127.0.0.1', '[::1]', 'your-project.supabase.co'].includes(url.hostname)
  )
    throw new Error('VITE_SUPABASE_URL must be the production HTTPS Supabase project origin.');

  const key = env.VITE_SUPABASE_ANON_KEY;
  const payload = jwtPayload(key);
  const publishable = typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publishable && payload?.role !== 'anon')
    throw new Error(
      'Set VITE_SUPABASE_ANON_KEY to a public anon JWT or publishable key from this Supabase project.',
    );
  if (typeof payload?.exp === 'number' && payload.exp * 1000 <= Date.now())
    throw new Error('VITE_SUPABASE_ANON_KEY has expired. Use the current public anon JWT.');
  if (
    payload?.ref &&
    url.hostname.endsWith('.supabase.co') &&
    url.hostname !== `${payload.ref}.supabase.co`
  )
    throw new Error('The public anon key and Supabase URL belong to different projects.');

  if (![undefined, '', 'true', 'false'].includes(env.VITE_ENABLE_WORKSPACE))
    throw new Error(
      'VITE_ENABLE_WORKSPACE must be true or false. Enable it only after backend activation.',
    );
}
