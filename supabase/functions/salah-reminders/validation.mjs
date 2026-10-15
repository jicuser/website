export { reminderProblem, cleanReminderSettings } from '../_shared/salahReminderSettings.js';
export function validSubscription(value) {
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 2000) throw new Error('Invalid device subscription.');
  const url = new URL(value.endpoint);
  const host = url.hostname;
  const trusted = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host === 'web.push.apple.com' || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
  if (!trusted || url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || /[\s\\]/.test(value.endpoint)) throw new Error('Unsupported notification provider.');
  if (!/^[A-Za-z0-9_-]{87}=?$/.test(value.keys?.p256dh || '') || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(value.keys?.auth || '')) throw new Error('Invalid notification keys.');
  return { endpoint: value.endpoint, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } };
}
export const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function notificationGroups(jobs) {
  const groups = new Map();
  for (const job of jobs) {
    const key = `${job.device_id}:${job.prayer}:${job.scheduled_at}`;
    if (!groups.has(key)) groups.set(key, { ...job, jobs: [], kinds: [] });
    groups.get(key).jobs.push({ id: job.id, lease: job.lease });
    groups.get(key).kinds.push(job.kind);
  }
  return [...groups.values()];
}
export function reminderNotification(job, now = new Date()) {
  const name = { fajr:'Fajr', dhuhr:'Dhuhr', asr:'Asr', maghrib:'Maghrib', isha:'Isha' }[job.prayer];
  if (!name) throw new Error('Invalid prayer.');
  const time = new Date(job.event_at);
  const minutes = Math.max(0, Math.ceil((time.getTime() - now.getTime()) / 60000));
  const kind = job.kinds.length > 1 ? 'start and Jama’ah' : job.kinds[0] === 'jamaah' ? 'Jama’ah' : 'start';
  const clock = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',hour:'numeric',minute:'2-digit',hour12:true}).format(time);
  return { title: `${name} ${kind}`, body: `${minutes ? `In ${minutes} minute${minutes === 1 ? '' : 's'}` : 'Now'} · ${clock} at Jamatia Islamic Centre.`, tag: `jic-${job.prayer}-${job.scheduled_at}`, url: '/prayer-times/reminders' };
}
