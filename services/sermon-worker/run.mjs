import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkedHttps, download, openAI, processJob } from './pipeline.mjs';

const base = checkedHttps(process.env.SUPABASE_URL || '').origin;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw Error('SUPABASE_SERVICE_ROLE_KEY required');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const provider = openAI({ key: process.env.OPENAI_API_KEY, summaryModel: process.env.OPENAI_SUMMARY_MODEL, transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1' });
const backend = {
  async rpc(name, body = {}) {
    const response = await fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw Error(`database_http_${response.status}`);
    return response.status === 204 ? null : response.json();
  },
  download(path, file) { return download(`${base}/storage/v1/object/sermon-recordings/${path.split('/').map(encodeURIComponent).join('/')}`, file, { headers }); },
  async upload(path, bytes) {
    const response = await fetch(`${base}/storage/v1/object/sermon-recordings/${path}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' }, body: bytes, signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw Error(`storage_http_${response.status}`);
  },
};
const jobs = await backend.rpc('claim_sermon_job');
for (const job of jobs || []) {
  const directory = await mkdtemp(join(tmpdir(), 'sermon-'));
  try {
    await processJob(job, { backend, provider, directory, radioUrl: process.env.RADIO_SOURCE_URL });
    console.info(JSON.stringify({ job: job.id, status: 'review' }));
  } catch (error) {
    const safeError = /^[a-z_]+(?:_[0-9]{3})?$/.test(error.message) ? error.message : 'processing_failed';
    await backend.rpc('finish_sermon_job', { p_id: job.id, p_lease_id: job.lease_id, p_error: safeError });
    console.error(JSON.stringify({ job: job.id, status: 'retry_or_failed', error: safeError }));
    process.exitCode = 1;
  } finally { await rm(directory, { recursive: true, force: true }); }
}
