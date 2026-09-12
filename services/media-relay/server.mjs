import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { streamDestinations, encoderArgs } from './destinations.mjs';

const site = process.env.SITE_ORIGIN;
const database = process.env.SUPABASE_URL;
const apiKey = process.env.SUPABASE_ANON_KEY;
if (!site?.startsWith('https://') || !database?.startsWith('https://') || !apiKey)
  throw new Error('Configure SITE_ORIGIN, SUPABASE_URL and SUPABASE_ANON_KEY.');
const allowed = {
  youtube: (
    process.env.YOUTUBE_HOSTS ||
    'a.rtmps.youtube.com,b.rtmps.youtube.com,a.rtmp.youtube.com,b.rtmp.youtube.com'
  ).split(','),
  tiktok: (process.env.TIKTOK_HOSTS || '').split(',').filter(Boolean),
};
const sessions = new Map();
const maxSessions = Number(process.env.MAX_SESSIONS || 3);
const halls = new Set(['mens-main', 'mens-upstairs', 'ladies-upstairs']);
function send(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': site,
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(value));
}
async function read(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Request too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function staff(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in again.');
  const headers = { apikey: apiKey, Authorization: authorization };
  const userResponse = await fetch(`${database}/auth/v1/user`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!userResponse.ok) throw new Error('Sign in again.');
  const user = await userResponse.json();
  const profileResponse = await fetch(`${database}/rest/v1/rpc/get_my_profile`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(10000),
  });
  if (!profileResponse.ok) throw new Error('Staff permission check failed.');
  const rows = await profileResponse.json();
  const p = Array.isArray(rows) ? rows[0] : rows;
  if (
    !p?.is_active ||
    !(p.is_owner || (p.permissions?.includes('tv') && p.permissions.includes('broadcast')))
  )
    throw new Error('TV and broadcasting permissions required.');
  return user.id;
}
function close(id) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  s.process.stdin.destroy();
  s.process.kill('SIGTERM');
  const timer = setTimeout(() => s.process.kill('SIGKILL'), 3000);
  timer.unref();
}
const server = http.createServer(async (req, res) => {
  if (req.headers.origin !== site) return send(res, 403, { error: 'Origin not allowed.' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': site,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      Vary: 'Origin',
    });
    res.end();
    return;
  }
  let s;
  try {
    const owner = await staff(req);
    const path = new URL(req.url, 'http://relay').pathname;
    if (req.method === 'POST' && path === '/sessions') {
      if (sessions.size >= maxSessions || [...sessions.values()].some((s) => s.owner === owner))
        throw new Error('Stop an existing broadcast first.');
      const body = JSON.parse((await read(req, 10000)).toString());
      if (!halls.has(body.screenId)) throw new Error('Choose a hall.');
      const destinations = streamDestinations(body.destinations, allowed);
      if (sessions.size >= maxSessions || [...sessions.values()].some((s) => s.owner === owner))
        throw new Error('Stop an existing broadcast first.');
      const id = randomUUID();
      const process = spawn('ffmpeg', encoderArgs(destinations), {
        stdio: ['pipe', 'ignore', 'ignore'],
        shell: false,
      });
      s = {
        owner,
        process,
        sequence: 0,
        busy: false,
        started: Date.now(),
        last: Date.now(),
        failed: false,
      };
      sessions.set(id, s);
      process.on('error', () => {
        s.failed = true;
      });
      process.on('exit', () => {
        s.failed = true;
      });
      process.stdin.on('error', () => {
        s.failed = true;
      });
      return send(res, 201, { id, status: 'starting' });
    }
    const match = path.match(/^\/sessions\/([a-f0-9-]{36})(?:\/chunks\/(\d+))?$/);
    if (!match) return send(res, 404, { error: 'Not found.' });
    const [, id, index] = match;
    s = sessions.get(id);
    if (!s || s.owner !== owner) return send(res, 404, { error: 'Session not found.' });
    if (req.method === 'DELETE') {
      close(id);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && index === undefined)
      return send(res, 200, { status: s.failed ? 'failed' : 'live' });
    if (req.method !== 'POST' || index === undefined)
      return send(res, 405, { error: 'Unsupported request.' });
    if (s.failed || s.busy || Number(index) !== s.sequence)
      throw new Error('Broadcast interrupted. Stop and start again.');
    s.busy = true;
    const bytes = await read(req, 8 * 1024 * 1024);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Encoder is not accepting video.')), 12000);
      s.process.stdin.write(bytes, (error) => {
        clearTimeout(timeout);
        error ? reject(new Error('Encoder stopped.')) : resolve();
      });
    });
    s.sequence++;
    s.last = Date.now();
    s.busy = false;
    send(res, 200, { ok: true });
  } catch (error) {
    if (s) s.busy = false;
    send(res, 400, { error: error.message || 'Broadcast failed.' });
  }
});
server.requestTimeout = 20000;
server.headersTimeout = 15000;
const cleanup = setInterval(() => {
  for (const [id, s] of sessions)
    if (Date.now() - s.last > 30000 || Date.now() - s.started > 8 * 3600000 || s.failed) close(id);
}, 5000);
cleanup.unref();
process.on('SIGTERM', () => {
  for (const id of sessions.keys()) close(id);
  server.close();
});
server.listen(Number(process.env.PORT || 8787), '0.0.0.0');
