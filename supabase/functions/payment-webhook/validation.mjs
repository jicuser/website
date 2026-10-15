const encoder = new TextEncoder();
/** Stripe signs the exact request bytes as timestamp + '.' + payload using HMAC-SHA256. */
export async function verifyStripeSignature(raw, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof raw !== 'string' || typeof header !== 'string' || header.length > 4096 || typeof secret !== 'string' || !secret.startsWith('whsec_') || secret.length < 24) return false;
  const values = header.split(',').map((part) => part.trim().split('='));
  const timestamps = values.filter(([key]) => key === 't').map(([, value]) => value);
  const signatures = values.filter(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/.test(value)).map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d{1,12}$/.test(timestamps[0]) || !signatures.length || signatures.length > 5) return false;
  if (Math.abs(nowSeconds - Number(timestamps[0])) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamps[0]}.${raw}`)));
  let valid = 0;
  for (const signature of signatures) {
    let difference = 0;
    for (let index = 0; index < expected.length; index++) difference |= expected[index] ^ parseInt(signature.slice(index * 2, index * 2 + 2), 16);
    valid |= Number(difference === 0);
  }
  return valid === 1;
}

/** @param {any} event @param {{liveMode?: boolean, connectedAccount?: string|null}} options */
export function stripeFeeEvent(event, { liveMode, connectedAccount = null } = {}) {
  if (!event || typeof event !== 'object' || event.object !== 'event' || !/^evt_[a-zA-Z0-9]{1,120}$/.test(event.id ?? '')) throw new Error('Invalid Stripe event.');
  if (typeof liveMode !== 'boolean' || event.livemode !== liveMode) throw new Error('Stripe mode mismatch.');
  if ((event.account ?? null) !== connectedAccount) throw new Error('Stripe account mismatch.');
  if (event.type !== 'payment_intent.succeeded') return null;
  const payment = event.data?.object;
  if (!payment || payment.object !== 'payment_intent' || payment.status !== 'succeeded' || !/^pi_[a-zA-Z0-9]{1,120}$/.test(payment.id ?? '') || !Number.isInteger(payment.amount_received) || payment.amount_received < 1 || payment.amount_received > 100000000 || payment.amount !== payment.amount_received || !/^[a-z]{3}$/.test(payment.currency ?? '') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payment.metadata?.fee_request_id ?? '')) throw new Error('Invalid fee payment event.');
  return { p_fee_id: payment.metadata.fee_request_id, p_amount_minor: payment.amount_received, p_currency: payment.currency.toUpperCase(), p_event_id: event.id, p_payment_id: payment.id };
}
