/** Layout is presentation only. Always pass a permission-filtered widget catalogue. */
export const AUDIENCES = ['owner', 'staff', 'teacher', 'volunteer', 'member'];
export const SCOPES = ['staff', 'portal'];
const validId = (id) => typeof id === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(id);
const ids = (value) => Array.isArray(value) ? [...new Set(value.filter(validId))].slice(0, 64) : [];
export function normaliseLayout(raw) {
  return { order: ids(raw?.order), hidden: ids(raw?.hidden), density: raw?.density === 'comfortable' ? 'comfortable' : 'compact' };
}
export function arrangeWidgets(items, layout, includeHidden = false) {
  const clean = normaliseLayout(layout);
  const byId = new Map(items.map((item) => [item.id, item]));
  const order = [...new Set([...clean.order, ...items.map((item) => item.id)])];
  return order.filter((id) => byId.has(id) && (includeHidden || !clean.hidden.includes(id))).map((id) => byId.get(id));
}
export function moveWidget(order, source, target) {
  if (source === target || !order.includes(source) || !order.includes(target)) return [...order];
  const next = order.filter((id) => id !== source);
  next.splice(order.indexOf(target), 0, source);
  return next;
}
export function audienceFor(auth, scope) {
  if (auth?.isOwner) return 'owner';
  const kinds = auth?.profile?.staff_kinds || [];
  if (kinds.includes('teacher')) return 'teacher';
  if (kinds.includes('volunteer')) return 'volunteer';
  return scope === 'portal' ? 'member' : 'staff';
}
export function validateLayout(raw, allowed) {
  if (!raw || !['compact', 'comfortable'].includes(raw.density)) throw new Error('Choose a supported density.');
  for (const key of ['order', 'hidden']) {
    if (!Array.isArray(raw[key]) || raw[key].length > 64 || raw[key].some((id) => !validId(id) || !allowed.includes(id))) throw new Error('Choose only supported dashboard widgets.');
    if (new Set(raw[key]).size !== raw[key].length) throw new Error('Remove duplicate widgets.');
  }
  return normaliseLayout(raw);
}

/** Group only the authorised, ordered widgets supplied by the caller. */
export function groupWidgets(items) {
  const groups = new Map();
  for (const item of items) {
    const name = item.group || 'Other tools';
    if (!groups.has(name)) groups.set(name, { name, items: [] });
    groups.get(name).items.push(item);
  }
  return [...groups.values()];
}
