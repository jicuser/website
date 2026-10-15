import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { JWT } from 'npm:google-auth-library@11.0.2';
import { pushMessage, validWorkerSecret } from './message.mjs';

type Job = { id: string; notification_id: string; lease_id: string };
type Notification = { id: string; user_id: string; kind: string };

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const secret = Deno.env.get('PUSH_WORKER_SECRET');
  if (!await validWorkerSecret(request.headers.get('authorization'), secret)) return new Response('Unauthorized', { status: 401 });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const rawCredentials = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!url || !key || !rawCredentials) return new Response('Worker is not configured', { status: 503 });
    const credentials = JSON.parse(rawCredentials);
    if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(credentials.project_id || '') || !credentials.client_email || !credentials.private_key) {
      return new Response('Worker is not configured', { status: 503 });
    }
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
    });
    const { data: jobs, error: claimError } = await db.rpc('claim_push_jobs');
    if (claimError) throw new Error('Queue unavailable');
    if (!jobs?.length) return Response.json({ processed: 0, completed: 0 });

    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    // Explicit credentials avoid metadata-server discovery. No credential payload is logged.
    const access = await auth.getAccessToken();
    if (!access.token) throw new Error('Provider authorization unavailable');

    const results = await Promise.all((jobs as Job[] ?? []).map(async (job) => {
      let delivered = false;
      let failure: string | null = 'delivery_failed';
      try {
        const { data: eligible, error: accessError } = await db.rpc('push_recipient_allowed', { p_notification_id: job.notification_id });
        if (accessError) throw new Error('Access check unavailable');
        if (!eligible) {
          delivered = true;
          failure = 'no_longer_eligible';
        } else {
          const { data: rawNotification, error: notificationError } = await db.from('user_notifications')
            .select('id,user_id,kind').eq('id', job.notification_id).single();
          if (notificationError || !rawNotification) throw new Error('Notification unavailable');
          const notification = rawNotification as Notification;
          const { data: devices, error: deviceError } = await db.from('push_devices')
            .select('token').eq('user_id', notification.user_id)
            .gte('updated_at', new Date(Date.now() - 30 * 86400_000).toISOString())
            .order('updated_at', { ascending: false }).limit(10);
          if (deviceError) throw new Error('Device lookup unavailable');
          const sent = await Promise.all((devices ?? []).map(async (device: { token: string }) => {
            const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(pushMessage(notification, device.token)),
              signal: AbortSignal.timeout(15_000),
            });
            if (response.ok) return true;
            const error = await response.json().catch(() => ({}));
            if (error.error?.details?.some((detail: { errorCode?: string }) => detail.errorCode === 'UNREGISTERED')) {
              const { error: deleteError } = await db.from('push_devices').delete().eq('token', device.token).eq('user_id', notification.user_id);
              if (deleteError) throw new Error('Device cleanup unavailable');
              return true;
            }
            return false;
          }));
          delivered = sent.every(Boolean);
          failure = delivered ? null : 'provider_rejected';
        }
      } catch {
        // The retry record never contains provider text, tokens, form data or credentials.
        failure = 'delivery_failed';
      }
      const { error } = await db.rpc('finish_push_job', {
        p_id: job.id, p_lease_id: job.lease_id, p_delivered: delivered, p_error: failure,
      });
      return !error && delivered;
    }));
    return Response.json({ processed: results.length, completed: results.filter(Boolean).length });
  } catch {
    return new Response('Push delivery temporarily unavailable', { status: 503 });
  }
});
