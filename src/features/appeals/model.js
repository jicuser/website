/** Presentation metadata cannot override the payment ledger. */
export function safeImageUrl(value) {
  if (typeof value !== 'string' || value.length > 2000 || /[\s\\]/.test(value)) return '';
  if (/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function campaignProgress(campaign) {
  const target = Number(campaign?.target_pence), raised = Number(campaign?.raised_pence);
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(raised)) return null;
  return Math.min(100, Math.max(0, raised / target * 100));
}
export function groupAppeals(records) {
  const items = Array.isArray(records) ? records.filter((item) => item && typeof item === 'object') : [];
  return { current: items.filter((item) => item.status === 'published').sort((a,b) => Number(!!b.featured)-Number(!!a.featured)), past: items.filter((item) => item.status === 'closed').sort((a,b) => String(b.completed_on || b.created_at || '').localeCompare(String(a.completed_on || a.created_at || ''))) };
}
export function validatePresentation(raw) {
  const cover = typeof raw?.cover_image === 'string' ? raw.cover_image.trim() : '';
  const alt = typeof raw?.image_alt === 'string' ? raw.image_alt.trim() : '';
  const outcome = typeof raw?.outcome === 'string' ? raw.outcome.trim() : '';
  const date = typeof raw?.completed_on === 'string' ? raw.completed_on : '';
  if (cover && !safeImageUrl(cover)) throw new Error('Use a secure image URL or uploaded image.');
  if (alt.length > 240 || (cover && !alt)) throw new Error('Add an image description of up to 240 characters.');
  if (outcome.length > 2000) throw new Error('Keep the outcome under 2,000 characters.');
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('Choose a real completion date.');
  return { cover_image: cover, image_alt: alt, outcome, completed_on: date || null, featured: raw?.featured === true };
}
