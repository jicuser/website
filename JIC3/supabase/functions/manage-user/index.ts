import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(url, service);

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorised');
    const { data: profile } = await adminClient.from('profiles').select('role,is_active').eq('id', user.id).single();
    if (!profile?.is_active || profile.role !== 'super_admin') throw new Error('Super admin access required');

    const body = await req.json();
    const allowedRoles = ['viewer','teacher','events_manager','content_editor','admin','super_admin'];

    if (body.action === 'invite') {
      if (!body.email || !allowedRoles.includes(body.role)) throw new Error('Invalid email or role');
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(body.email, {
        data: { display_name: body.display_name || body.email.split('@')[0] },
      });
      if (error) throw error;
      if (data.user) await adminClient.from('profiles').update({ role: body.role, is_active: true }).eq('id', data.user.id);
      return Response.json({ ok: true, user_id: data.user?.id }, { headers: corsHeaders });
    }

    if (body.action === 'set_role') {
      if (!body.user_id || !allowedRoles.includes(body.role)) throw new Error('Invalid user or role');
      if (body.user_id === user.id && body.role !== 'super_admin') throw new Error('You cannot demote your own super-admin account');
      const { error } = await adminClient.from('profiles').update({ role: body.role }).eq('id', body.user_id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (body.action === 'set_active') {
      if (!body.user_id || typeof body.is_active !== 'boolean') throw new Error('Invalid request');
      if (body.user_id === user.id && body.is_active === false) throw new Error('You cannot disable your own account');
      const { error } = await adminClient.from('profiles').update({ is_active: body.is_active }).eq('id', body.user_id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    throw new Error('Unsupported action');
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers: corsHeaders });
  }
});
