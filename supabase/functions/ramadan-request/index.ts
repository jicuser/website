import { verifyFormProtection, ProtectionError } from '../_shared/form-protection.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import { readJson } from '../_shared/read-json.mjs';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body;
  try {
    body = await readJson(req);
    await verifyFormProtection(req, body, { env: (key) => Deno.env.get(key) });
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error('Check your details.');
    if (body.website) return json({ reference: 'REQUEST-RECEIVED' });
    if (
      !['iftar', 'suhoor', 'daily'].includes(body.kind) ||
      !Array.isArray(body.dates) ||
      body.dates.length < 1 ||
      body.dates.length > 30 ||
      body.dates.some(
        (value: unknown) => typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value),
      )
    )
      throw new Error('Choose your days.');
    if (
      typeof body.sponsor_name !== 'string' ||
      body.sponsor_name.trim().length < 2 ||
      body.sponsor_name.length > 120
    )
      throw new Error('Enter your name.');
    if (
      typeof body.phone !== 'string' ||
      typeof body.email !== 'string' ||
      body.phone.length > 80 ||
      body.email.length > 254 ||
      (!body.phone.trim() && !body.email.trim())
    )
      throw new Error('Add a phone number or email.');
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
      throw new Error('Check your email address.');
    if (
      !body.email &&
      (!/^[+\d\s().-]+$/.test(body.phone) || body.phone.replace(/\D/g, '').length < 6)
    )
      throw new Error('Check your phone number.');
    if (
      !Number.isInteger(body.amount_pence) ||
      body.amount_pence < 0 ||
      body.amount_pence > 100000000 ||
      (body.kind === 'daily' && body.amount_pence === 0)
    )
      throw new Error('Enter your amount per day.');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      typeof body.season_id !== 'string' ||
      !uuid.test(body.season_id) ||
      typeof body.request_key !== 'string' ||
      !uuid.test(body.request_key) ||
      body.consent !== true
    )
      throw new Error('Check your request.');
  } catch (error) {
    return json({ error: error.message || 'Check your details.' }, error instanceof ProtectionError ? error.status : 400);
  }
  try {
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(Deno.env.get('SUPABASE_URL')!, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${service}:${new Date().toISOString().slice(0, 10)}:${ip}`),
    );
    const source = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
    const { data, error } = await db.rpc('submit_ramadan_request', {
      p_body: body,
      p_source_key: source,
    });
    if (error?.message === 'request_rate_limit')
      return json({ error: 'Please try again in an hour.' }, 429);
    if (error?.message === 'invalid_request')
      return json({ error: 'Check your details and selected dates.' }, 400);
    if (
      error?.message.startsWith('One of those meal days') ||
      error?.message.startsWith('One of those sponsorship days') ||
      error?.message === 'These sponsorship bookings are closed.' ||
      error?.message.startsWith('Calendar dates changed') || error?.message.startsWith('Sponsorship dates changed')
    )
      return json({ error: error.message }, 409);
    if (error) return json({ error: 'Your request was not saved. Please try again.' }, 503);
    return json(data);
  } catch {
    return json({ error: 'Your request was not saved. Please try again.' }, 503);
  }
});
