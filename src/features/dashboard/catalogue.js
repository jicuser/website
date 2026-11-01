import { ADMIN_SECTIONS } from '@/content/adminNavigation';
export const PORTAL_WIDGETS = [
  ['invoices', 'My invoices'], ['certificates', 'My certificates'], ['fundraising', 'My fundraising'],
  ['family', 'My family'], ['learning', 'My learning'], ['forms', 'Forms & replies'],
  ['fees', 'Fees & receipts'], ['tasks', 'My actions'], ['booking', 'Request a booking'], ['donate', 'Support JIC'],
].map(([id, name]) => ({ id, name }));
export const dashboardCatalogue = (scope) => scope === 'staff'
  ? ADMIN_SECTIONS.filter((item) => item.id !== 'dashboard') : PORTAL_WIDGETS;
