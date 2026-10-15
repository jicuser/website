import { createClient } from 'npm:@supabase/supabase-js@2.30.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body, status = 200) => Response.json(body, { status, headers });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (Deno.env.get('ACCOUNT_REQUESTS_ENABLED') !== 'true') return json({ error: 'Online account requests are not available yet. Please contact JIC.' }, 503);
  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const raw = await req.text();
    if (raw.length > 10000) return json({ error: 'Request is too large.' }, 413);
    const body = JSON.parse(raw);
    const name = String(body.display_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.requested_role || '');
    const message = String(body.message || '').trim().slice(0, 2000);
    const features = Array.isArray(body.requested_features)
      ? body.requested_features.filter((item) => typeof item === 'string' && item.length <= 80).slice(0, 12)
      : [];
    if (name.length < 2 || name.length > 120) throw new Error('Enter your name.');
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error('Enter a valid email address.');
    if (!['parent_guardian', 'student', 'teacher', 'volunteer', 'imam', 'office'].includes(role))
      throw new Error('Choose how you are connected to JIC.');
    const { data: existing } = await db
      .from('account_access_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    if (existing) return json({ ok: true });
    const { error } = await db.from('account_access_requests').insert({
      display_name: name,
      email,
      requested_role: role,
      requested_features: features,
      message,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Request failed.' }, 400);
  }
});
