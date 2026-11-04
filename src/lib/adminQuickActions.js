const QUICK_ACTIONS = [
  { id: 'pages', permission: 'content', title: 'Create a page', detail: 'Add text, photos and forms.', href: '/admin?section=content&view=add' },
  { id: 'forms', permission: 'forms', title: 'Forms & responses', detail: 'Edit questions. Review replies.', href: '/admin?section=forms' },
  { id: 'classes', permission: 'content', title: 'Courses & classes', detail: 'Class details and registration.', href: '/admin?section=content&view=pages' },
  { id: 'people', permission: 'users', title: 'Staff access', detail: 'Invite staff. Set permissions.', href: '/admin?section=users' },
  { id: 'finance', permission: 'finance', title: 'Invoices & payments', detail: 'Invoices and payment records.', href: '/admin?section=finance' },
  { id: 'prayer', permission: 'prayer_times', title: 'Salah times', detail: 'Timetable, Jummah and downloads.', href: '/admin?section=prayer' },
];

export function availableQuickActions(can) {
  if (typeof can !== 'function') return [];
  return QUICK_ACTIONS.filter((action) => can(action.permission)).map((action) => ({ ...action }));
}
