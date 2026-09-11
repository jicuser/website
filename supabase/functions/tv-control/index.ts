import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import {
  activeSession,
  isTvStaff,
  publicSettings,
  screenExists,
  validateSettings,
  validDescription,
} from '../_shared/tv.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function fail(message: string, status = 400): never {
  throw new ApiError(message, status);
}
async function result(query: any) {
  const { data, error } = await query;
  if (error) {
    console.error('TV database operation failed:', error.code);
    fail('TV service could not complete the request.', 503);
  }
  return data;
}
const expires = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
async function staff(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) fail('Sign in to manage TV screens.', 401);
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user) fail('Sign in to manage TV screens.', 401);
  const profile = await result(
    db.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle(),
  );
  if (!isTvStaff(profile)) fail('You do not have permission to manage TV screens.', 403);
  return user.id;
}
async function device(screenId: string, token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail('Pair this TV again.', 401);
  const row = await result(
    db
      .from('tv_devices')
      .select('id')
      .eq('screen_id', screenId)
      .eq('token_hash', await hash(token))
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),
  );
  if (!row) fail('This TV pairing has expired or was revoked.', 401);
  return row.id;
}
function iceServers() {
  // Optional TURN configuration belongs in Edge secrets, never in public site settings.
  const raw = Deno.env.get('TV_ICE_SERVERS');
  try {
    return raw ? JSON.parse(raw) : [{ urls: 'stun:stun.l.google.com:19302' }];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    if (req.method !== 'POST') fail('Use POST.', 405);
    const raw = await req.text();
    if (raw.length > 75000) fail('Request too large.', 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      fail('Invalid request.');
    }
    if (!body || !screenExists(body.screenId)) fail('Unknown TV screen.', 404);
    const { action, screenId } = body;
    const screen = await result(db.from('tv_screens').select('*').eq('id', screenId).single());
    let response: any;

    if (action === 'status') {
      const paired = body.deviceToken ? Boolean(await device(screenId, body.deviceToken)) : false;
      response = {
        id: screen.id,
        label: screen.label,
        settings: publicSettings(screen.settings, paired),
        paired,
        session:
          paired && activeSession(screen)
            ? { id: screen.share_session, kind: screen.share_kind }
            : null,
      };
    } else if (action === 'pair') {
      if (typeof body.code !== 'string' || !/^[a-f0-9]{64}$/.test(body.code))
        fail('Invalid pairing code.', 401);
      // DELETE … RETURNING makes a pairing link single-use, including simultaneous requests.
      const claimed = await result(
        db
          .from('tv_pairing_codes')
          .delete()
          .eq('screen_id', screenId)
          .eq('code_hash', await hash(body.code))
          .gt('expires_at', new Date().toISOString())
          .select('screen_id'),
      );
      if (!claimed?.length) fail('This pairing link has expired or was already used.', 401);
      const token = randomToken();
      await result(
        db
          .from('tv_devices')
          .insert({
            screen_id: screenId,
            token_hash: await hash(token),
            expires_at: expires(90 * 86400),
          }),
      );
      response = { deviceToken: token };
    } else if (['join', 'receive', 'answer'].includes(action)) {
      const deviceId = await device(screenId, body.deviceToken);
      if (!activeSession(screen) || body.sessionId !== screen.share_session)
        fail('Sharing has ended.', 409);
      if (action === 'join') {
        const peer = await result(
          db
            .from('tv_peers')
            .upsert(
              {
                screen_id: screenId,
                session_id: screen.share_session,
                device_id: deviceId,
                offer: null,
                answer: null,
              },
              { onConflict: 'session_id,device_id' },
            )
            .select('id')
            .single(),
        );
        response = { peerId: peer.id, iceServers: iceServers() };
      } else {
        let query = db.from('tv_peers');
        if (action === 'answer') {
          if (!validDescription(body.description, 'answer')) fail('Invalid answer.');
          query = query.update({ answer: body.description });
        }
        const peer = await result(
          query
            .select('id,offer')
            .eq('id', body.peerId)
            .eq('device_id', deviceId)
            .eq('session_id', screen.share_session)
            .eq('screen_id', screenId)
            .maybeSingle(),
        );
        if (!peer) fail('Receiver not found.', 404);
        response = peer;
      }
    } else {
      const userId = await staff(req);
      if (action === 'admin') {
        const devices = await result(
          db
            .from('tv_devices')
            .select('id,created_at,expires_at')
            .eq('screen_id', screenId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at'),
        );
        response = { ...screen, devices };
      } else if (action === 'save') {
        const settings = validateSettings(body.settings);
        await result(
          db
            .from('tv_screens')
            .update({ settings, updated_at: new Date().toISOString() })
            .eq('id', screenId),
        );
        response = { settings };
      } else if (action === 'pair-code') {
        const code = randomToken();
        const expires_at = expires(600);
        await result(
          db
            .from('tv_pairing_codes')
            .upsert({ screen_id: screenId, code_hash: await hash(code), expires_at }),
        );
        response = { code, expires_at };
      } else if (action === 'revoke') {
        await result(
          db.from('tv_devices').delete().eq('screen_id', screenId).eq('id', body.deviceId),
        );
        response = { ok: true };
      } else if (action === 'start') {
        if (!['screen', 'camera'].includes(body.kind)) fail('Choose screen or camera.');
        const sessionId = crypto.randomUUID();
        const started = await result(
          db
            .from('tv_screens')
            .update({
              share_session: sessionId,
              share_owner: userId,
              share_kind: body.kind,
              share_expires: expires(90),
            })
            .eq('id', screenId)
            .or(`share_session.is.null,share_expires.lt.${new Date().toISOString()}`)
            .select('id'),
        );
        if (!started?.length)
          fail('Someone is already sharing to this screen. Stop that session first.', 409);
        await result(db.from('tv_peers').delete().eq('screen_id', screenId));
        response = { sessionId, iceServers: iceServers() };
      } else if (action === 'stop') {
        const stopped = await result(
          db
            .from('tv_screens')
            .update({
              share_session: null,
              share_owner: null,
              share_kind: null,
              share_expires: null,
            })
            .eq('id', screenId)
            .eq('share_session', body.sessionId)
            .select('id'),
        );
        if (stopped?.length)
          await result(db.from('tv_peers').delete().eq('session_id', body.sessionId));
        response = { ok: true };
      } else if (['heartbeat', 'peers', 'offer'].includes(action)) {
        if (
          !activeSession(screen) ||
          screen.share_owner !== userId ||
          screen.share_session !== body.sessionId
        )
          fail('This sharing session has ended.', 409);
        if (action === 'heartbeat') {
          const updated = await result(
            db
              .from('tv_screens')
              .update({ share_expires: expires(90) })
              .eq('id', screenId)
              .eq('share_session', body.sessionId)
              .eq('share_owner', userId)
              .select('id'),
          );
          if (!updated?.length) fail('This sharing session has ended.', 409);
          response = { ok: true };
        } else if (action === 'peers') {
          response = {
            peers: await result(
              db
                .from('tv_peers')
                .select('id,offer,answer')
                .eq('screen_id', screenId)
                .eq('session_id', body.sessionId)
                .limit(16),
            ),
          };
        } else {
          if (!validDescription(body.description, 'offer')) fail('Invalid offer.');
          const updated = await result(
            db
              .from('tv_peers')
              .update({ offer: body.description, answer: null })
              .eq('id', body.peerId)
              .eq('screen_id', screenId)
              .eq('session_id', body.sessionId)
              .select('id'),
          );
          if (!updated?.length) fail('Receiver not found.', 404);
          response = { ok: true };
        }
      } else fail('Unknown action.');
    }
    return new Response(JSON.stringify(response), { headers });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'TV request failed.' }),
      { status, headers },
    );
  }
});
