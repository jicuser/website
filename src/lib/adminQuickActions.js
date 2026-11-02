const QUICK_ACTIONS = [
  { id: 'pages', permission: 'content', title: 'Create a website page', detail: 'Add information, photos and a form. Preview before publishing.', href: '/admin?section=content&view=add' },
  { id: 'forms', permission: 'forms', title: 'Forms & responses', detail: 'Find a form, edit its questions or follow up a response.', href: '/admin?section=forms' },
  { id: 'classes', permission: 'content', title: 'Course & class pages', detail: 'Publish class details and link an interest or registration form.', href: '/admin?section=content&view=pages' },
  { id: 'people', permission: 'users', title: 'Staff & account access', detail: 'Invite people and choose what each person can access.', href: '/admin?section=users' },
  { id: 'finance', permission: 'finance', title: 'Invoices & payments', detail: 'Create invoices and record payments received.', href: '/admin?section=finance' },
  { id: 'prayer', permission: 'prayer_times', title: 'Update Salah times', detail: 'Edit the timetable and published Jummah times.', href: '/admin?section=prayer' },
];

export function availableQuickActions(can) {
  if (typeof can !== 'function') return [];
  return QUICK_ACTIONS.filter((action) => can(action.permission)).map((action) => ({ ...action }));
}
