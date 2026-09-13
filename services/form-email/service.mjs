import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhook(raw, headers, secret, now = Date.now()) {
  const id = headers['svix-id'], timestamp = headers['svix-timestamp'], signature = headers['svix-signature'];
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 1024 * 1024 || typeof id !== 'string' || id.length > 200 || !/^\d{10,12}$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300 || typeof signature !== 'string' || signature.length > 2000 || !secret?.startsWith('whsec_')) throw Error('invalid_webhook');
  const key = Buffer.from(secret.slice(6), 'base64');
  if (key.length < 16) throw Error('invalid_webhook_secret');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest();
  const valid = signature.split(' ').some((candidate) => {
    const [version, value] = candidate.split(',');
    if (version !== 'v1' || !value) return false;
    const bytes = Buffer.from(value, 'base64');
    return bytes.length === expected.length && timingSafeEqual(bytes, expected);
  });
  if (!valid) throw Error('invalid_webhook');
  return JSON.parse(raw);
}
export function emailAddress(value) {
  if (typeof value !== 'string' || value.length > 320 || /[\r\n]/.test(value)) return null;
  const match = value.trim().match(/^(?:[^<>]*<)?([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)>?$/);
  return match?.[1].toLowerCase() || null;
}
export function threadFromAddresses(addresses, domain) {
  if (!Array.isArray(addresses)) return null;
  for (const value of addresses) {
    const address = emailAddress(value);
    if (!address?.endsWith(`@${domain.toLowerCase()}`)) continue;
    const match = address.split('@')[0].match(/^reply\+([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/);
    if (match) return match[1];
  }
  return null;
}
async function boundedJson(response, limit = 2 * 1024 * 1024) {
  if (!response.ok) throw Error(`provider_http_${response.status}`);
  if (Number(response.headers?.get?.('content-length') || 0) > limit) throw Error('provider_response_too_large');
  if (!response.body) return response.json();
  const chunks=[]; let length=0;
  for await (const chunk of response.body) { length+=chunk.length; if(length>limit) { await response.body.cancel?.().catch(()=>{}); throw Error('provider_response_too_large'); } chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function resendProvider({ key, from, replyDomain, fetcher = fetch }) {
  if (!key || !emailAddress(from) || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(replyDomain || '')) throw Error('email_not_configured');
  const request = async (path, init = {}) => boundedJson(await fetcher(`https://api.resend.com/${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...init.headers }, signal: AbortSignal.timeout(25_000) }));
  return {
    async send(job) {
      if (!emailAddress(job.recipient) || /[\r\n]/.test(job.subject) || typeof job.body !== 'string' || job.body.length > 6000 || !/^[0-9a-f-]{36}$/.test(job.thread_id)) throw Error('invalid_email_job');
      const result = await request('emails', { method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key':`form-email/${job.id}`}, body:JSON.stringify({ from, to:[job.recipient], subject:job.subject, text:job.body, reply_to:`reply+${job.thread_id}@${replyDomain.toLowerCase()}` }) });
      if (typeof result.id !== 'string' || result.id.length > 200) throw Error('missing_provider_id');
      return result.id;
    },
    async receive(id) { if(!/^[0-9a-f-]{36}$/i.test(id || '')) throw Error('invalid_received_id'); return request(`emails/receiving/${id}`); },
  };
}
export async function dispatchEmails({ backend, provider, enabled }) {
  await backend.rpc('set_form_email_ready',{p_enabled:enabled});
  if (!enabled) return {processed:0};
  const jobs=await backend.rpc('claim_form_emails'); let processed=0;
  for (const job of jobs || []) {
    try {
      const id=await provider.send(job);
      await backend.rpc('finish_form_email',{p_id:job.id,p_lease_id:job.lease_id,p_provider_id:id});
      processed++;
    } catch (error) {
      const safe=/^[a-z_]+(?:_[0-9]{3})?$/.test(error.message) ? error.message : 'email_delivery_unconfirmed';
      await backend.rpc('finish_form_email',{p_id:job.id,p_lease_id:job.lease_id,p_error:safe});
    }
  }
  return {processed};
}
export async function receiveEmail({raw,headers,secret,replyDomain,backend,provider,now}) {
  const event=verifyWebhook(raw,headers,secret,now);
  if (event.type!=='email.received') return {ignored:true};
  const email=await provider.receive(event.data?.email_id);
  const thread=threadFromAddresses([...(email.to || []),...(email.received_for || [])],replyDomain);
  if (!thread) return {ignored:true};
  // A provider signature proves delivery through that provider, not the sender's identity.
  // Every inbound message enters staff-only review. Never render remote HTML or fetch attachments.
  let body=typeof email.text==='string' && email.text.trim() ? email.text.trim() : '[HTML-only email. Read the original in the email provider inbox before accepting.]';
  if (email.attachments?.length) body+='\n\n[Attachments remain in the email provider inbox and were not imported.]';
  if(body.length>6000) body=body.slice(0,5920)+'\n[Message truncated. Read the full original in the email provider inbox.]';
  await backend.rpc('receive_form_email',{p_provider_id:email.id,p_thread_id:thread,p_sender:(emailAddress(email.from) || 'Unknown sender').slice(0,320),p_subject:String(email.subject || '(No subject)').replace(/[\r\n]/g,' ').slice(0,160),p_body:body});
  return {received:true};
}
