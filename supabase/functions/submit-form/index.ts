import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import { validateSubmission } from './validation.mjs';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
  if (!req.headers.get('content-type')?.includes('application/json'))
    return reply(415, { error: 'Use JSON.' });

  // Limit bytes while reading, including requests without Content-Length.
  const reader = req.body?.getReader();
  if (!reader) return reply(400, { error: 'No form received.' });
  const chunks: Uint8Array[] = [];
  let size = 0;
  let submission;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 24000) {
        await reader.cancel();
        return reply(413, { error: 'Please shorten the form answers.' });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    submission = validateSubmission(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    return reply(400, { error: error instanceof SyntaxError ? 'Invalid form.' : error.message });
  }

  try {
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(Deno.env.get('SUPABASE_URL')!, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Daily salted network fingerprint; raw IP addresses are never stored.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${service}:${new Date().toISOString().slice(0, 10)}:${ip}`));
    const sourceKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const { error } = await client.rpc('submit_website_form', {
      p_kind: submission.kind, p_payload: submission.payload, p_source_key: sourceKey,
    });
    if (error?.message === 'submission_rate_limit') return reply(429, { error: 'Too many submissions. Please try again in ten minutes or contact the centre.' });
    if (error) return reply(503, { error: 'Your form could not be saved. Please try again or contact the centre.' });
    return reply(200, { ok: true });
  } catch {
    return reply(503, { error: 'Your form could not be saved. Please try again or contact the centre.' });
  }
});
