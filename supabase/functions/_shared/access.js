// Stable permission IDs are shared by the website, Edge Functions and future app.
export const PERMISSIONS = [
  ['content', 'Website pages and text'],
  ['media', 'Upload pictures in permitted editors'],
  ['events', 'Events and posters'],
  ['announcements', 'Notices'],
  ['prayer_times', 'Prayer timetable'],
  ['team', 'Public team page'],
  ['livestream', 'Website livestream settings'],
  ['tv', 'TV scenes and device inputs'],
  ['broadcast', 'Recording and broadcasting (also select TV)'],
  ['forms_contact', 'Contact messages'],
  ['forms_madrassah', 'Madrassah enquiries'],
  ['forms_itikaaf', 'I’tikaf registrations'],
  ['users', 'Invite staff and manage access'],
  ['audit', 'Activity history'],
  ['delete_content', 'Delete content in permitted sections'],
];
export const STAFF_KINDS = [
  ['imam', 'Imam'],
  ['teacher', 'Teacher'],
  ['volunteer', 'Volunteer'],
  ['office', 'Office team'],
  ['media', 'Media team'],
  ['tv_team', 'TV team'],
];
export function hasPermission(profile, permission) {
  if (!profile?.is_active) return false;
  if (profile.is_owner === true) return true;
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
  if (permission === 'dashboard')
    return permissions.some((key) => key !== 'tv' && key !== 'broadcast');
  if (permission === 'forms') return permissions.some((key) => key.startsWith('forms_'));
  return permissions.includes(permission);
}
export function hasAdminAccess(profile) {
  return Boolean(
    profile?.is_active &&
    (profile.is_owner === true ||
      (Array.isArray(profile.permissions) &&
        profile.permissions.some((key) => PERMISSIONS.some(([id]) => id === key)))),
  );
}
export function validateAccess(input) {
  const result = {};
  for (const [field, catalogue] of [
    ['permissions', PERMISSIONS],
    ['staff_kinds', STAFF_KINDS],
  ]) {
    const values = input?.[field];
    if (
      !Array.isArray(values) ||
      values.length > catalogue.length ||
      values.some((value) => !catalogue.some(([id]) => id === value)) ||
      new Set(values).size !== values.length
    )
      throw new Error(`Choose valid ${field === 'permissions' ? 'permissions' : 'staff labels'}.`);
    result[field] = [...values];
  }
  return result;
}
// Delegated managers can only grant permissions they hold and cannot manage owners.
export function canManageAccount(actor, target) {
  if (!hasPermission(actor, 'users') || target?.is_owner) return false;
  return (
    actor.is_owner === true || (target?.permissions || []).every((key) => hasPermission(actor, key))
  );
}
export function validateDelegation(actor, access) {
  if (
    !hasPermission(actor, 'users') ||
    access.permissions.some((key) => !hasPermission(actor, key))
  )
    throw new Error('You can only assign permissions that you hold.');
  return access;
}
