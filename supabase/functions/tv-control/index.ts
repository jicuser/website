import { validateDeviceName, nameProblem } from '../_shared/tv-scenes.js';
import { streamTemplateSettings } from '../_shared/stream-template.js';
import { createSessionCode, isActivePresentation } from '../_shared/tv-session.js';
import { hasPermission } from '../_shared/access.js';
import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import {
  normaliseTvSettings,
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
    fail('The display service could not complete the request.', 503);
  }
  return data;
}
const expires = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
const receiverStates = new Set([
  'waiting', 'answering', 'answered', 'connected', 'failed', 'NotSupportedError',
  'OperationError', 'InvalidStateError', 'NetworkError', 'TimeoutError',
]);
const validId = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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
  if (!token) fail('Sign in to manage hall streams.', 401);
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user) fail('Sign in to manage hall streams.', 401);
  const profile = await result(
    db.from('profiles').select('is_owner,permissions,is_active').eq('id', user.id).maybeSingle(),
  );
  if (!isTvStaff(profile)) fail('You do not have permission to manage hall streams.', 403);
  return user.id;
}
const validToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
type Presentation = { id: string; code: string; expires_at: string | null };
async function device(
  screenId: string,
  token: unknown,
  presentation: Presentation | null,
  acknowledgement?: { seenRevision: unknown; revision: string },
) {
  if (!validToken(token) || !presentation) fail('Enter the current session code to watch.', 401);
  const now = Date.now();
  const row = await result(
    db.from('tv_devices')
      .select('id,name,expires_at,last_seen_at,applied_revision,is_preview')
      .eq('screen_id', screenId)
      .eq('presentation_id', presentation.id)
      .eq('token_hash', await hash(token))
      .gt('expires_at', new Date(now).toISOString())
      .maybeSingle(),
  );
  if (!row) fail('This viewing session ended. Enter the current session code.', 401);
  const changes: Record<string, string> = {};
  // Active viewers may refresh during the same presentation. Previews still expire.
  if (!row.is_preview && Date.parse(row.expires_at) - now < 3600000) {
    changes.expires_at = new Date(Math.min(now + 86400000,
      presentation.expires_at ? Date.parse(presentation.expires_at) : Infinity)).toISOString();
  }
  if (acknowledgement) {
    if (!row.last_seen_at || now - Date.parse(row.last_seen_at) >= 15000)
      changes.last_seen_at = new Date(now).toISOString();
    if (acknowledgement.seenRevision === acknowledgement.revision &&
        row.applied_revision !== acknowledgement.revision) {
      changes.applied_revision = acknowledgement.revision;
      changes.last_seen_at = new Date(now).toISOString();
    }
  }
  if (Object.keys(changes).length) {
    await result(db.from('tv_devices').update(changes).eq('id', row.id)
      .eq('presentation_id', presentation.id).gt('expires_at', new Date().toISOString()));
  }
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
    if (!body || !screenExists(body.screenId)) fail('Unknown hall stream.', 404);
    const { action, screenId } = body;
    const screen = await result(db.from('tv_screens').select('*').eq('id', screenId).single());
    screen.settings = normaliseTvSettings(screen.settings);
    if (screenId === 'shoe-area') {
      screen.settings = validateSettings(screen.settings, screenId);
      if (
        ['start', 'join', 'receive', 'answer', 'offer', 'heartbeat', 'join-session', 'new-presentation'].includes(action)
      )
        fail('The shoe-area screen shows times and posters only.', 403);
    }
    const savedPresentation = await result(
      db.from('tv_presentations').select('id,code,expires_at').eq('screen_id', screenId).maybeSingle(),
    );
    const presentation: Presentation | null = isActivePresentation(savedPresentation, screen.settings)
      ? savedPresentation : null;
    const displayMode = presentation ? 'teaching' : 'normal';
    const liveInputs = () =>
      result(
        db
          .from('tv_inputs')
          .select('slot,session_id,kind,owner_id,expires_at,device_name')
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
      if (!input || !presentation) fail('This input has ended.', 409);
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
      let paired = false;
      if (body.deviceToken && presentation) {
        try {
          paired = Boolean(await device(screenId, body.deviceToken, presentation, {
            seenRevision: body.seenRevision, revision: screen.updated_at,
          }));
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
        }
      }
      response = {
        id: screen.id, label: screen.label, revision: screen.updated_at,
        displayMode, presentationId: presentation?.id || null,
        settings: publicSettings({ ...screen.settings, scene_mode: displayMode }, paired),
        paired,
        inputs: paired ? (await liveInputs()).map(({ slot, session_id, kind }: any) => ({
          slot, id: session_id, kind,
        })) : [],
      };
    } else if (action === 'display-code') {
      if (!validToken(body.deviceToken)) fail('Refresh this display webpage to get a code.');
      const issued = await result(db.rpc('request_display_code', {
        hall: screenId, credential_hash: await hash(body.deviceToken),
        client_hash: await hash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'),
      }));
      if (issued.error) fail(issued.error, issued.status || 400);
      response = issued;
    } else if (action === 'join-session') {
      if (body.presentationId !== undefined &&
          (!validId(body.presentationId) || body.presentationId !== presentation?.id))
        fail('This watching link has ended. Ask the organiser for the current link.', 410);
      const name = validateDeviceName(body.name);
      const token = randomToken();
      // Supabase's gateway supplies the forwarding address. The database also caps
      // attempts per hall so a missing or changing address cannot bypass the limit.
      const clientAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const joined = await result(db.rpc('join_tv_presentation', {
        hall: screenId, session_code: typeof body.code === 'string' ? body.code.trim() : '',
        viewer_name: name, credential_hash: await hash(token),
        client_hash: await hash(clientAddress),
      }));
      if (joined.error) fail(joined.error, joined.status || 403);
      response = { ...joined, deviceToken: token };
    } else if (action === 'leave') {
      // Cleanup is safe even when the publisher has stopped or the scene has changed.
      const deviceId = await device(screenId, body.deviceToken, presentation);
      if (!validId(body.peerId) || !validId(body.sessionId)) fail('Unknown receiver.', 400);
      await result(
        db.from('tv_peers').delete()
          .eq('id', body.peerId)
          .eq('device_id', deviceId)
          .eq('session_id', body.sessionId)
          .eq('screen_id', screenId),
      );
      response = { ok: true };
    } else if (['join', 'receive', 'answer', 'receiver-state'].includes(action)) {
      const deviceId = await device(screenId, body.deviceToken, presentation);
      const input = await getInput();
      if (action === 'join') {
        // Each mounted player gets its own peer; opening another tab cannot reset its SDP.
        const { data: peerId, error } = await db.rpc('join_tv_receiver', {
          hall: screenId,
          input_session: input.session_id,
          receiver_device: deviceId,
        });
        if (error) fail('This display has too many open receivers, or the input ended. Close an unused viewing tab and try again.', 409);
        response = { peerId, iceServers: iceServers() };
      } else {
        if (!validId(body.peerId)) fail('Unknown receiver.', 400);
        const changes: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
        if (action === 'answer') {
          if (!validDescription(body.description, 'answer')) fail('Invalid answer.');
          if (body.offerSdp !== undefined && !validDescription({ type: 'offer', sdp: body.offerSdp }, 'offer'))
            fail('Invalid offer reference.');
          Object.assign(changes, { answer: body.description, receiver_state: 'answered' });
        }
        if (action === 'receiver-state') {
          if (!receiverStates.has(body.state)) fail('Unknown receiver state.');
          changes.receiver_state = body.state;
        }
        let query = db.from('tv_peers').update(changes)
          .eq('id', body.peerId)
          .eq('device_id', deviceId)
          .eq('session_id', input.session_id)
          .eq('screen_id', screenId);
        // New receivers tie their answer to the offer they processed; older clients remain valid.
        if (action === 'answer' && body.offerSdp !== undefined)
          query = query.eq('offer->>sdp', body.offerSdp);
        const peer = await result(
          query
            .select('id,offer')
            .maybeSingle(),
        );
        if (!peer) {
          if (action === 'answer' && body.offerSdp !== undefined)
            fail('The offer changed. Read the current offer and answer again.', 409);
          fail('Receiver not found.', 404);
        }
        response = peer;
      }
    } else {
      const userId = await staff(req);
      if (action === 'admin') {
        const devices = await result(
          db
            .from('tv_devices')
            .select('id,name,created_at,expires_at,last_seen_at,applied_revision,is_preview')
            .eq('screen_id', screenId)
            .eq('presentation_id', presentation?.id || '00000000-0000-0000-0000-000000000000')
            .gt('expires_at', new Date().toISOString())
            .order('created_at'),
        );
        response = {
          ...screen, settings: { ...screen.settings, scene_mode: displayMode },
          presentation, devices: presentation ? devices.filter((d: any) => !d.is_preview) : [],
          templates: await result(db.from('tv_scene_templates').select('id,name,scene,settings,updated_at')
            .eq('screen_id', screenId).order('name')),
          inputs: presentation ? await liveInputs() : [],
          relayConfigured: iceServers().some((server: any) =>
            [server.urls].flat().some((url: unknown) => typeof url === 'string' && /^turns?:/.test(url))),
        };
      } else if (action === 'approve-display') {
        const code = typeof body.code === 'string' ? body.code.trim() : '';
        if (!/^\d{6}$/.test(code)) fail('Enter the six-digit code shown on the display webpage.');
        const name = typeof body.name === 'string' && body.name.trim()
          ? validateDeviceName(body.name) : null;
        const approved = await result(db.rpc('approve_display_code', {
          actor: userId, hall: screenId, connection_code: code, display_name: name,
        }));
        if (approved.error) fail(approved.error, approved.status || 400);
        response = approved;
      } else if (action === 'save-template') {
        if (screenId === 'shoe-area') fail('Choose a hall stream to save a scene.');
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 80) fail('Use 1–80 characters for the saved scene name.');
        const complete = body.settings ? streamTemplateSettings(body.settings, screenId) : null;
        const checked = validateSettings({
          ...screen.settings, scene_mode: 'teaching', class_until: '',
          ...(complete || { scenes: [body.scene], active_scene_id: body.scene?.id }),
        }, screenId);
        const values = { name, scene: checked.scenes[0], settings: complete, updated_at: new Date().toISOString() };
        let template;
        if (body.templateId) {
          if (!validId(body.templateId) || typeof body.expectedUpdatedAt !== 'string')
            fail('Choose a saved scene to update.');
          template = await result(db.from('tv_scene_templates').update(values)
            .eq('id', body.templateId).eq('screen_id', screenId)
            .eq('updated_at', body.expectedUpdatedAt).select('id,name,scene,settings,updated_at').maybeSingle());
          if (!template) fail('This saved scene changed. Reload it before replacing it.', 409);
        } else {
          template = await result(db.from('tv_scene_templates').insert({
            ...values, screen_id: screenId, created_by: userId,
          }).select('id,name,scene,settings,updated_at').single());
        }
        response = { template };
      } else if (action === 'delete-template') {
        if (!validId(body.templateId)) fail('Choose a saved scene to remove.');
        await result(db.from('tv_scene_templates').delete().eq('id', body.templateId)
          .eq('screen_id', screenId));
        response = { ok: true };
      } else if (['normal', 'save', 'save-background', 'new-presentation'].includes(action)) {
        const settings = validateSettings(
          action === 'normal'
            ? { ...screen.settings, scene_mode: 'normal', class_until: '' }
            : action === 'save-background'
            ? { ...body.settings, scene_mode: screen.settings.scene_mode,
                scenes: screen.settings.scenes, active_scene_id: screen.settings.active_scene_id,
                class_until: screen.settings.class_until, muted: screen.settings.muted }
            : body.settings,
          screenId,
        );
        if (['save', 'new-presentation'].includes(action) && settings.scene_mode === 'teaching') {
          for (const scene of settings.scenes) {
            const problem = nameProblem(scene.name, 'scene name');
            if (problem) fail(problem);
            for (const layer of scene.layers) {
              if (layer.type === 'input') validateDeviceName(layer.name);
            }
          }
        }
        let nextCode;
        do nextCode = createSessionCode(); while (nextCode === savedPresentation?.code);
        const { data: saved, error } = await db.rpc('save_tv_presentation', {
          actor: userId,
          hall: screenId,
          config: settings,
          expected: body.expectedUpdatedAt,
          new_code: nextCode,
          restart: action === 'new-presentation',
        });
        if (error) fail(error.message, 409);
        response = saved;
      } else if (action === 'preview') {
        if (!presentation) fail('Start the stream to preview connected devices. Your draft is kept.', 409);
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
              presentation_id: presentation.id,
              is_preview: true,
              name: 'Admin preview',
              token_hash: await hash(token),
              expires_at: new Date(Math.min(Date.now() + duration * 1000,
                presentation.expires_at ? Date.parse(presentation.expires_at) : Infinity)).toISOString(),
            })
            .select('id')
            .single(),
        );
        response = { deviceToken: token, deviceId: preview.id };
      } else if (action === 'rename-device') {
        if (!validId(body.deviceId)) fail('Choose a connected display.', 400);
        const renamed = await result(
          db.from('tv_devices').update({ name: validateDeviceName(body.name) })
            .eq('screen_id', screenId).eq('id', body.deviceId)
            .gt('expires_at', new Date().toISOString()).select('id').maybeSingle(),
        );
        if (!renamed) fail('This display is no longer connected to this session.', 404);
        response = { ok: true };
      } else if (action === 'revoke') {
        await result(
          db.from('tv_devices').delete().eq('screen_id', screenId).eq('id', body.deviceId),
        );
        response = { ok: true };
      } else if (action === 'start') {
        if (!presentation) fail('Start the stream before connecting a device input.', 409);
        if (
          !['screen', 'camera'].includes(body.kind) ||
          !['input-1', 'input-2', 'input-3', 'input-4'].includes(body.slot)
        )
          fail('Choose a device input and camera or screen.');
        const name = body.deviceName === undefined ? null : validateDeviceName(body.deviceName);
        const { data: sessionId, error } = await db.rpc(name ? 'start_named_tv_input' : 'start_tv_input', {
          actor: userId,
          hall: screenId,
          input_slot: body.slot,
          input_kind: body.kind,
          ...(name ? { device_name: name } : {}),
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
                .select('id,offer,answer,receiver_state')
                .eq('screen_id', screenId)
                .eq('session_id', body.sessionId)
                .gt('last_seen_at', expires(-90))
                .order('last_seen_at', { ascending: false })
                .limit(16),
            ),
          };
        } else {
          if (!validDescription(body.description, 'offer')) fail('Invalid offer.');
          const updated = await result(
            db
              .from('tv_peers')
              .update({ offer: body.description, answer: null, receiver_state: 'waiting' })
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
