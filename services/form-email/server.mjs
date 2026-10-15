import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { dispatchEmails, receiveEmail, resendProvider } from './service.mjs';
const enabled = process.env.FORM_EMAIL_ENABLED === 'true';
const supabase = new URL(process.env.SUPABASE_URL || '');
if (supabase.protocol !== 'https:' || supabase.username || supabase.password)
  throw Error('Configure secure SUPABASE_URL');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  dispatchSecret = process.env.FORM_EMAIL_WORKER_SECRET;
if (!serviceKey || !dispatchSecret || dispatchSecret.length < 32)
  throw Error('Configure server credentials');
const provider = enabled
  ? resendProvider({
      key: process.env.RESEND_API_KEY,
      from: process.env.FORM_EMAIL_FROM,
      replyDomain: process.env.FORM_EMAIL_REPLY_DOMAIN,
    })
  : null;
if (enabled && !process.env.RESEND_WEBHOOK_SECRET?.startsWith('whsec_'))
  throw Error('Configure signed inbound webhook secret');
const backend = {
  async rpc(name, body = {}) {
    const response = await fetch(`${supabase.origin}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw Error(`database_http_${response.status}`);
    return response.status === 204 ? null : response.json();
  },
};
const authorised = (value) => {
  const expected = Buffer.from(`Bearer ${dispatchSecret}`),
    actual = Buffer.from(value || '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/health') {
    res.end('{"ok":true}');
    return;
  }
  if (req.method !== 'POST' || !['/dispatch', '/webhooks/resend'].includes(req.url)) {
    res.writeHead(404);
    res.end('{}');
    return;
  }
  if (req.url === '/dispatch' && !authorised(req.headers.authorization)) {
    res.writeHead(401);
    res.end('{}');
    return;
  }
  if (req.url === '/webhooks/resend' && !enabled) {
    res.writeHead(503);
    res.end('{}');
    return;
  }
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        res.writeHead(413);
        res.end('{}');
        return;
      }
      chunks.push(chunk);
    }
    const result =
      req.url === '/dispatch'
        ? await dispatchEmails({ backend, provider, enabled })
        : await receiveEmail({
            raw: Buffer.concat(chunks).toString('utf8'),
            headers: req.headers,
            secret: process.env.RESEND_WEBHOOK_SECRET,
            replyDomain: process.env.FORM_EMAIL_REPLY_DOMAIN,
            backend,
            provider,
          });
    res.end(JSON.stringify(result));
  } catch (error) {
    const invalid = error.message === 'invalid_webhook';
    res.writeHead(invalid ? 400 : 503);
    res.end(JSON.stringify({ error: invalid ? 'Invalid signature' : 'Email service unavailable' }));
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
