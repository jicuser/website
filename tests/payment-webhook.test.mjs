import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyStripeSignature,
  stripeFeeEvent,
} from '../supabase/functions/payment-webhook/validation.mjs';
const secret = 'whsec_example_endpoint_secret_at_least_32';
const encoder = new TextEncoder();
async function sign(raw, t = 1800000000) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${t}.${raw}`)),
  );
  return `t=${t},v1=${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
const event = {
  id: 'evt_original',
  object: 'event',
  type: 'payment_intent.succeeded',
  livemode: false,
  data: {
    object: {
      id: 'pi_original',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 2500,
      amount_received: 2500,
      currency: 'gbp',
      metadata: { fee_request_id: '00000000-0000-4000-8000-000000000001' },
    },
  },
};
test('Stripe signature covers exact raw bytes, timestamp and endpoint secret', async () => {
  const raw = JSON.stringify(event),
    header = await sign(raw);
  assert.equal(await verifyStripeSignature(raw, header, secret, 1800000000), true);
  assert.equal(await verifyStripeSignature(`${raw} `, header, secret, 1800000000), false);
  assert.equal(await verifyStripeSignature(raw, header, `${secret}different`, 1800000000), false);
  assert.equal(await verifyStripeSignature(raw, header, secret, 1800000301), false);
  assert.equal(await verifyStripeSignature(raw, header, secret, 1799999699), false);
  assert.equal(
    await verifyStripeSignature(raw, `${header},t=1800000000`, secret, 1800000000),
    false,
  );
  assert.equal(
    await verifyStripeSignature(raw, 't=1800000000,v1=garbage', secret, 1800000000),
    false,
  );
  assert.equal(
    await verifyStripeSignature(raw, `${header},v1=${'0'.repeat(64)}`, secret, 1800000000),
    true,
  );
});
test('provider event requires succeeded exact amount and expected test/live/account mode', () => {
  const validated = stripeFeeEvent(event, { liveMode: false });
  assert.equal(validated.p_amount_minor, 2500);
  assert.equal(validated.p_currency, 'GBP');
  assert.throws(() => stripeFeeEvent(event, { liveMode: true }), /mode mismatch/);
  assert.throws(
    () => stripeFeeEvent({ ...event, account: 'acct_other' }, { liveMode: false }),
    /account mismatch/,
  );
  for (const change of [
    { status: 'processing' },
    { amount_received: 2499 },
    { amount: 2499 },
    { currency: 'GBP' },
    { metadata: { fee_request_id: '../fake' } },
    { amount: Infinity, amount_received: Infinity },
  ])
    assert.throws(
      () =>
        stripeFeeEvent(
          { ...event, data: { object: { ...event.data.object, ...change } } },
          { liveMode: false },
        ),
      /Invalid fee/,
    );
  assert.equal(
    stripeFeeEvent({ ...event, type: 'payment_intent.created' }, { liveMode: false }),
    null,
  );
});
