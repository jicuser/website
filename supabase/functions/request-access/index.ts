import { verifyFormProtection, ProtectionError } from '../_shared/form-protection.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import { readJson } from '../_shared/read-json.mjs';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const json = (body, status = 200) => Response.json(body, { status, headers });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body;
  try {
    body = await readJson(req);
    await verifyFormProtection(req, body, { env: (key) => Deno.env.get(key) });
    if (typeof body !== 'object' || !body) throw new Error('Please complete the form.');
    if (body.website) return json({ ok: true });
    if (body.consent !== true) throw new Error('Please confirm that JIC can contact you about access.');
    body.display_name = String(body.display_name || '').trim();
    body.email = String(body.email || '').trim().toLowerCase();
    if (body.display_name.length < 2 || body.display_name.length > 120) throw new Error('Enter your name.');
    if (body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw new Error('Enter a valid email address.');
    if (String(body.message || '').length > 2000) throw new Error('Please keep the message under 2,000 characters.');
    if (!Array.isArray(body.requested_features) || body.requested_features.length > 8) throw new Error('Choose the access you need.');
  } catch (error) { return json({ error: error.message || 'Check the form.' }, error instanceof ProtectionError ? error.status : 400); }
  try {
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(Deno.env.get('SUPABASE_URL')!, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${service}:${new Date().toISOString().slice(0,10)}:${ip}`));
    const sourceKey = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
    const { error } = await db.rpc('submit_account_request', { p_body: body, p_source_key: sourceKey });
    if (error?.message === 'request_rate_limit') return json({ error: 'Too many requests. Please try again in an hour.' }, 429);
    if (error?.message === 'invalid_request') return json({ error: 'Check your name, email and connection to JIC.' }, 400);
    if (error) return json({ error: 'Your request could not be saved. Please try again.' }, 503);
    // Same receipt for a new request and an email already awaiting review.
    return json({ ok: true });
  } catch { return json({ error: 'Your request could not be saved. Please try again.' }, 503); }
});
