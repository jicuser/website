import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import { accountSetupUrl } from './site-url.mjs';
import {
  hasPermission,
  validateAccess,
  validateDelegation,
  canManageAccount,
} from '../_shared/access.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405, headers });
  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user)
      return Response.json({ error: 'Sign in again.' }, { status: 401, headers });
    const { data: actor } = await db.from('profiles').select('*').eq('id', user.id).single();
    if (!hasPermission(actor, 'users'))
      return Response.json(
        { error: 'Staff management permission required.' },
        { status: 403, headers },
      );
    const raw = await req.text();
    if (raw.length > 8000) throw new Error('Request is too large.');
    const body = JSON.parse(raw);
    const setup = accountSetupUrl(Deno.env.get('JIC_SITE_URL'));
    if (body.action === 'invite') {
      const access = validateDelegation(actor, validateAccess(body));
      const email = String(body.email || '')
        .trim()
        .toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a valid email address.');
      const name = String(body.display_name || email.split('@')[0])
        .trim()
        .slice(0, 120);
      const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
        data: { display_name: name },
        redirectTo: setup,
      });
      if (error || !data.user)
        throw new Error(error?.message || 'Invitation could not be created.');
      // The database rechecks delegation under row locks. A failed grant leaves the new account without access.
      const { error: grantError } = await db.rpc('manage_staff_access', {
        actor: user.id,
        target: data.user.id,
        new_permissions: access.permissions,
        new_kinds: access.staff_kinds,
        enabled: true,
      });
      if (grantError)
        throw new Error(
          'Invitation sent, but permissions were not saved. Open this account and save its access.',
        );
      return Response.json({ ok: true }, { headers });
    }
    if (typeof body.user_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.user_id))
      throw new Error('Choose a staff account.');
    const { data: target } = await db.from('profiles').select('*').eq('id', body.user_id).single();
    if (!target) throw new Error('Staff account not found.');
    if (body.action === 'send_setup') {
      if (!target.is_active || (target.id !== user.id && !canManageAccount(actor, target)))
        throw new Error('You cannot send a setup email for this account.');
      const { data, error } = await db.auth.admin.getUserById(target.id);
      if (error || !data.user?.email) throw new Error('This account has no email address.');
      const { error: sendError } = await db.auth.resetPasswordForEmail(data.user.email, {
        redirectTo: setup,
      });
      if (sendError) throw sendError;
      await db
        .from('audit_log')
        .insert({
          actor_id: user.id,
          actor_name: actor.display_name || 'Staff',
          table_name: 'profiles',
          record_id: target.id,
          action: 'SEND_SETUP',
        });
      return Response.json({ ok: true }, { headers });
    }
    const args: Record<string, unknown> = { actor: user.id, target: target.id };
    if (body.action === 'set_permissions') {
      const access = validateDelegation(actor, validateAccess(body));
      args.new_permissions = access.permissions;
      args.new_kinds = access.staff_kinds;
    } else if (body.action === 'set_active' && typeof body.is_active === 'boolean')
      args.enabled = body.is_active;
    else throw new Error('Unsupported action.');
    const { error } = await db.rpc('manage_staff_access', args);
    if (error) throw error;
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Request failed.' },
      { status: 400, headers },
    );
  }
});
