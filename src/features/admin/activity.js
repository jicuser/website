const AREAS = {
  page_content: 'Website pages',
  page_sections: 'Page sections',
  site_pages: 'Programme pages',
  events: 'Events',
  announcements: 'Notices',
  team_members: 'Team profiles',
  prayer_times: 'Prayer times',
  livestream_settings: 'Website livestream',
  profiles: 'Staff accounts',
  account_access_requests: 'Account requests',
  custom_forms: 'Forms',
  form_submissions: 'Form responses',
  work_tasks: 'Assigned actions',
  certificate_requests: 'Certificate requests',
  community_campaigns: 'Fundraising campaigns',
  community_finance_settings: 'Invoice settings',
  community_invoices: 'Invoices',
  community_payments: 'Payments',
  community_safeguarding_checks: 'Safeguarding checks',
};
const ACTIONS = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  REASSIGN: 'Reassigned',
  APPROVE: 'Approved',
  DECLINE: 'Declined',
  ISSUE: 'Issued',
  VOID: 'Voided',
  PUBLISH: 'Published',
  RESTORE: 'Restored',
};
const humanise = (value, fallback) => {
  const text = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : fallback;
};

export const activityAreaLabel = (value) =>
  Object.hasOwn(AREAS, value) ? AREAS[value] : humanise(value, 'Centre records');
export const activityActionLabel = (value) =>
  Object.hasOwn(ACTIONS, value) ? ACTIONS[value] : humanise(value, 'Change recorded');

/** A failed read must never look like an empty activity log. */
export async function loadAdminActivity(client) {
  try {
    const { data, error } = await client
      .from('audit_log')
      .select('id,actor_id,actor_name,table_name,record_id,action,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (
      error ||
      !Array.isArray(data) ||
      data.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
    )
      throw new Error('Activity unavailable');
    return data;
  } catch {
    throw new Error('The activity log could not be loaded. Please try again.');
  }
}
