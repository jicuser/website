import { hasPermission } from '../_shared/access.js';
import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import {
  normaliseTvSettings,
  isTvStaff,
  publicSettings,
  screenExists,
  validateSettings,
  validDescription,
  tvScene,
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
    db.from('profiles').select('is_owner,permissions,is_active').eq('id', user.id).maybeSingle(),
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
    if (raw.length > 190000) fail('Request too large.', 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      fail('Invalid request.');
    }
    if (!body || !screenExists(body.screenId)) fail('Unknown TV screen.', 404);
    const { action, screenId } = body;
    const screen = await result(db.from('tv_screens').select('*').eq('id', screenId).single());
    screen.settings = normaliseTvSettings(screen.settings);
    if (screenId === 'shoe-area') {
      screen.settings = validateSettings(screen.settings, screenId);
      if (
        ['start', 'join', 'receive', 'answer', 'offer', 'heartbeat', 'pair', 'pair-code'].includes(
          action,
        )
      )
        fail('The shoe-area screen shows times and posters only.', 403);
    }
    const liveInputs = () =>
      result(
        db
          .from('tv_inputs')
          .select('slot,session_id,kind,owner_id,expires_at')
          .eq('screen_id', screenId)
          .gt('expires_at', new Date().toISOString()),
      );
    const getInput = async () => {
      if (typeof body.sessionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.sessionId))
        fail('Unknown input.', 409);
      const input = await result(
        db
          .from('tv_inputs')
          .select('*')
          .eq('screen_id', screenId)
          .eq('session_id', body.sessionId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle(),
      );
      if (!input || tvScene(screen.settings) !== 'teaching') fail('This input has ended.', 409);
      const owner = await result(
        db
          .from('profiles')
          .select('is_owner,is_active,permissions')
          .eq('id', input.owner_id)
          .maybeSingle(),
      );
      if (!isTvStaff(owner)) fail('This input is no longer authorised.', 409);
      return input;
    };
    let response: any;

    if (action === 'status') {
      const paired = body.deviceToken ? Boolean(await device(screenId, body.deviceToken)) : false;
      response = {
        id: screen.id,
        label: screen.label,
        settings: publicSettings(screen.settings, paired),
        paired,
        inputs:
          paired && tvScene(screen.settings) === 'teaching'
            ? (await liveInputs()).map(({ slot, session_id, kind }: any) => ({
                slot,
                id: session_id,
                kind,
              }))
            : [],
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
        db.from('tv_devices').insert({
          screen_id: screenId,
          token_hash: await hash(token),
          expires_at: expires(90 * 86400),
        }),
      );
      response = { deviceToken: token };
    } else if (['join', 'receive', 'answer'].includes(action)) {
      const deviceId = await device(screenId, body.deviceToken);
      const input = await getInput();
      if (action === 'join') {
        const peer = await result(
          db
            .from('tv_peers')
            .upsert(
              {
                screen_id: screenId,
                session_id: input.session_id,
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
            .eq('session_id', input.session_id)
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
        response = { ...screen, devices, inputs: await liveInputs() };
      } else if (action === 'normal' || action === 'save') {
        const settings = validateSettings(
          action === 'normal'
            ? { ...screen.settings, scene_mode: 'normal', class_until: '' }
            : body.settings,
          screenId,
        );
        const { data: updated_at, error } = await db.rpc('save_tv_scene', {
          actor: userId,
          hall: screenId,
          config: settings,
          expected: body.expectedUpdatedAt,
        });
        if (error) fail(error.message, 409);
        response = { settings, updated_at };
      } else if (action === 'preview') {
        let duration = 600;
        if (body.purpose === 'broadcast') {
          const profile = await result(
            db.from('profiles').select('is_owner,is_active,permissions').eq('id', userId).single(),
          );
          if (!hasPermission(profile, 'broadcast')) fail('Recording permission required.', 403);
          duration = 8 * 3600;
        }
        const token = randomToken();
        const preview = await result(
          db
            .from('tv_devices')
            .insert({
              screen_id: screenId,
              token_hash: await hash(token),
              expires_at: expires(duration),
            })
            .select('id')
            .single(),
        );
        response = { deviceToken: token, deviceId: preview.id };
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
        if (
          !['screen', 'camera'].includes(body.kind) ||
          !['input-1', 'input-2', 'input-3', 'input-4'].includes(body.slot)
        )
          fail('Choose a device input and camera or screen.');
        const { data: sessionId, error } = await db.rpc('start_tv_input', {
          actor: userId,
          hall: screenId,
          input_slot: body.slot,
          input_kind: body.kind,
        });
        if (error) fail(error.message, 409);
        response = { sessionId, iceServers: iceServers() };
      } else if (action === 'stop') {
        await result(
          db.from('tv_inputs').delete().eq('screen_id', screenId).eq('session_id', body.sessionId),
        );
        response = { ok: true };
      } else if (['heartbeat', 'peers', 'offer'].includes(action)) {
        const input = await getInput();
        if (input.owner_id !== userId) fail('This input belongs to another staff device.', 403);
        if (action === 'heartbeat') {
          const updated = await result(
            db
              .from('tv_inputs')
              .update({ expires_at: expires(90) })
              .eq('screen_id', screenId)
              .eq('session_id', body.sessionId)
              .eq('owner_id', userId)
              .select('slot'),
          );
          if (!updated?.length) fail('This input has ended.', 409);
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
