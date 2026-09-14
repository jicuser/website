import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import { validateUpload, hasExpectedSignature, safeFilename, responsesCsv } from './validation.mjs';
import { createZip } from './zip.mjs';
import { validWorkerSecret } from './maintenance.mjs';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
class RequestError extends Error { constructor(message: string, public status = 400) { super(message); } }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checkedId = (value: unknown) => { if (typeof value !== 'string' || !uuid.test(value)) throw new RequestError('Invalid identifier.'); return value; };
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, '0')).join('');
const secretToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
const claimHash = async (token: unknown) => { if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new RequestError('Invalid upload token.'); return sha256(token); };

async function readJson(req: Request) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new RequestError('Use JSON.', 415);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError('No request received.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 65536) { await reader.cancel(); throw new RequestError('Please shorten the form.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Invalid request.');
  return body;
}

function databaseFailure(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const message = error.message ?? '';
  if (message === 'submission_rate_limit') throw new RequestError('Too many requests. Try again in ten minutes.', 429);
  if (message === 'form_version_changed') throw new RequestError('This form has changed. Reload it before submitting.', 409);
  if (message === 'Attempt already used') throw new RequestError('This attempt was already submitted with different answers. Start a new form.', 409);
  if (/permission required|access required|Active account/i.test(message)) throw new RequestError('You do not have access to this response.', 403);
  if (error.code === 'P0001' && message.length <= 160) throw new RequestError(message);
  if (['22P02', '23502', '23503', '23514', '22007', '22008'].includes(error.code ?? '')) throw new RequestError('Check the form answers and try again.');
  throw new RequestError('The form service is temporarily unavailable. Please retry.', 503);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
  try {
    const body = await readJson(req);
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), url = Deno.env.get('SUPABASE_URL');
    if (!serviceKey || !url) throw new RequestError('Form service is not configured.', 503);
    const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const storage = client.storage.from('form-attachments');
    const rpc = async (name: string, params: Record<string, unknown> = {}) => {
      const { data, error } = await client.rpc(name, params); databaseFailure(error); return data;
    };
    const authorization = req.headers.get('authorization') ?? '';
    if (body.action === 'cleanup') {
      if (!await validWorkerSecret(authorization, Deno.env.get('FORMS_MAINTENANCE_SECRET'))) throw new RequestError('Not authorised.', 401);
      const rows = await rpc('expired_custom_form_uploads');
      let removed = 0;
      for (const row of rows ?? []) {
        const { error } = await storage.remove([row.object_key]);
        if (error) continue;
        await rpc('delete_expired_custom_form_upload', { p_id: row.id }); removed++;
      }
      return reply(200, { ok: true, removed });
    }
    let userId: string | null = null;
    if (authorization) {
      const token = authorization.replace(/^Bearer\s+/i, '');
      // Both public client key formats represent a visitor, never an authenticated account.
      // Some SDK versions also send the publishable key as their default Bearer value.
      // Public actions already permit no Authorization header; accepting this format grants
      // no extra access. All other credentials must validate as an actual user JWT.
      const visitorKey = token === Deno.env.get('SUPABASE_ANON_KEY') || /^sb_publishable_[A-Za-z0-9_-]+$/.test(token);
      if (!visitorKey) {
        const { data, error } = await client.auth.getUser(token);
        if (error || !data.user) throw new RequestError('Please sign in again.', 401);
        userId = data.user.id;
      }
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const sourceKey = await sha256(`${serviceKey}:${new Date().toISOString().slice(0, 10)}:${ip}`);
    const getForm = async () => {
      if (typeof body.slug !== 'string' || body.slug.length > 80 || !Number.isInteger(body.version)) throw new RequestError('Choose a published form.');
      const form = await rpc('get_public_form', { p_slug: body.slug });
      if (!form) throw new RequestError('This form is not currently available.', 404);
      if (form.version !== body.version) throw new RequestError('This form has changed. Reload it before submitting.', 409);
      return form;
    };
    if (body.action === 'submit') {
      // The transactional SQL validator also recognizes an accepted retry after republishing.
      if (typeof body.slug !== 'string' || body.slug.length > 80 || !Number.isInteger(body.version)) throw new RequestError('Choose a published form.');
      const answers = body.answers;
      const uploads = body.uploads ?? [];
      if (!Array.isArray(uploads) || uploads.length > 5) throw new RequestError('Too many attachments.');
      const claims = [];
      for (const upload of uploads) claims.push({ id: checkedId(upload?.id), token_hash: await claimHash(upload?.upload_token) });
      const id = await rpc('submit_custom_form', { p_slug: body.slug, p_version: body.version, p_answers: answers, p_source_key: sourceKey, p_attempt: checkedId(body.idempotency_key), p_user_id: userId, p_uploads: claims });
      return reply(200, { ok: true, id });
    }
    if (body.action === 'upload_prepare') {
      const form = await getForm();
      const field = form.schema.fields.find((candidate: { id: string }) => candidate.id === body.field_id);
      const file = validateUpload(field, body), uploadToken = secretToken();
      const upload = await rpc('prepare_custom_form_upload', { p_slug: body.slug, p_version: body.version, p_field_id: body.field_id, p_attempt: checkedId(body.idempotency_key), p_source_key: sourceKey, p_user_id: userId, p_token_hash: await sha256(uploadToken), p_file_name: file.file_name, p_mime_type: file.mime_type, p_size_bytes: file.size_bytes });
      const { data, error } = await storage.createSignedUploadUrl(upload.object_key, { upsert: false });
      if (error || !data) throw new RequestError('The upload could not start. Please retry.', 503);
      return reply(200, { upload_id: upload.id, upload_token: uploadToken, path: data.path, token: data.token, signed_url: data.signedUrl });
    }
    if (body.action === 'upload_finish') {
      const id = checkedId(body.upload_id), hash = await claimHash(body.upload_token);
      const upload = await rpc('get_custom_form_upload', { p_id: id, p_token_hash: hash });
      if (!upload) throw new RequestError('This upload expired. Choose the file again.');
      if (upload.ready) return reply(200, { ok: true, id });
      const { data, error } = await storage.download(upload.object_key);
      if (error || !data) throw new RequestError('Finish uploading the file before continuing.');
      if (data.size !== upload.size_bytes || data.size > 10 * 1024 * 1024 || !hasExpectedSignature(new Uint8Array(await data.slice(0, 32).arrayBuffer()), upload.mime_type)) {
        await storage.remove([upload.object_key]);
        throw new RequestError('The file contents do not match its type or size. Choose a supported file.');
      }
      await rpc('finish_custom_form_upload', { p_id: id, p_token_hash: hash });
      return reply(200, { ok: true, id });
    }
    if (!userId) throw new RequestError('Please sign in to continue.', 401);
    if (body.action === 'download') {
      const attachment = await rpc('custom_attachment_object', { p_id: checkedId(body.attachment_id), p_user_id: userId });
      if (!attachment) throw new RequestError('Attachment is not available to this account.', 403);
      const { data, error } = await storage.createSignedUrl(attachment.object_key, 60, { download: safeFilename(attachment.file_name) });
      if (error || !data) throw new RequestError('The download could not start.', 503);
      return reply(200, { url: data.signedUrl, expires_in: 60 });
    }
    if (body.action === 'export') {
      const formId = checkedId(body.form_id), ids = body.submission_ids ?? null;
      if (ids !== null && (!Array.isArray(ids) || ids.length < 1 || ids.length > 100)) throw new RequestError('Select 1 to 100 responses.');
      if (ids) for (const id of ids) checkedId(id);
      if (!['csv', 'zip'].includes(body.format)) throw new RequestError('Choose CSV or ZIP.');
      const result = await rpc('custom_form_export', { p_form_id: formId, p_user_id: userId, p_ids: ids });
      const csv = new TextEncoder().encode(responsesCsv(result.rows));
      let bytes = csv;
      if (body.format === 'zip') {
        if (result.attachments.length > 50 || result.attachments.reduce((sum: number, attachment: { size_bytes: number }) => sum + attachment.size_bytes, 0) > 25 * 1024 * 1024) throw new RequestError('Select fewer responses: ZIP exports allow 50 files and 25 MiB.', 413);
        const files = [{ name: 'responses.csv', bytes: csv }];
        for (const attachment of result.attachments) {
          const { data, error } = await storage.download(attachment.object_key);
          if (error || !data || data.size !== attachment.size_bytes) throw new RequestError('An attachment could not be downloaded. Please retry.', 503);
          files.push({ name: `${attachment.submission_id}/${attachment.id}-${safeFilename(attachment.file_name)}`, bytes: new Uint8Array(await data.arrayBuffer()) });
        }
        bytes = createZip(files);
      }
      return new Response(bytes, { status: 200, headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="responses-${formId}.${body.format}"` } });
    }
    throw new RequestError('Unknown form action.');
  } catch (error) {
    if (error instanceof RequestError) return reply(error.status, { error: error.message });
    if (error instanceof SyntaxError) return reply(400, { error: 'Invalid JSON request.' });
    // Validation errors contain only fixed labels/field names, never answers or credentials.
    if (error instanceof Error && /required\.|Check |form field|field answer|hidden field|upload field|Choose JPEG|Files must|shorten|Visibility|different options|unique field/.test(error.message)) return reply(400, { error: error.message });
    return reply(503, { error: 'The form service is temporarily unavailable. Please retry.' });
  }
});
