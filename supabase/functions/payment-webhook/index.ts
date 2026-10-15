import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import { verifyStripeSignature, stripeFeeEvent } from './validation.mjs';
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET'), mode = Deno.env.get('STRIPE_LIVE_MODE');
  if (!secret || !['true', 'false'].includes(mode ?? '')) return reply(503, { error: 'Webhook is not configured.' });
  try {
    const reader = req.body?.getReader();
    if (!reader) return reply(400, { error: 'Missing event.' });
    const parts: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); return reply(413, { error: 'Event too large.' }); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!await verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) return reply(401, { error: 'Invalid signature.' });
    const payment = stripeFeeEvent(JSON.parse(raw), { liveMode: mode === 'true', connectedAccount: Deno.env.get('STRIPE_CONNECTED_ACCOUNT') || null });
    if (!payment) return reply(200, { received: true, ignored: true });
    const url = Deno.env.get('SUPABASE_URL'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !service) return reply(503, { error: 'Webhook is not configured.' });
    const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.rpc('record_stripe_fee_payment', payment);
    if (error) return reply(error.code === 'P0001' ? 422 : 503, { error: 'Payment requires reconciliation. No receipt was changed.' });
    return reply(200, { received: true });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || (error instanceof Error && /Invalid .*event|Stripe .* mismatch/.test(error.message))) return reply(400, { error: 'Invalid payment event.' });
    return reply(503, { error: 'Could not process payment event. Retry later.' });
  }
});
