import { SITE } from '../content/site.js';

export function communityUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol === 'https:' && !url.username && !url.password &&
      ((url.hostname === 'chat.whatsapp.com' && /^\/[A-Za-z0-9]{22}\/?$/.test(url.pathname)) ||
       (url.hostname === 'wa.me' && /^\/\d+$/.test(url.pathname)))) return url.href;
  } catch { /* An empty or invalid CMS setting must not disable the public invite. */ }
  return SITE.community.whatsapp;
}
