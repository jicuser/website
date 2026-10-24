// One visitor-facing identity for each service, reused by links and the admin catalogue.
export const SERVICE_ENQUIRIES = [
  {
    slug: 'nikah-enquiry',
    title: 'Nikah enquiry',
    page: '/services/nikah',
    pageName: 'Nikah',
    description: 'Ask about a Nikah date, availability or requirements.',
  },
  {
    slug: 'funeral-enquiry',
    title: 'Funeral support',
    page: '/funerals',
    pageName: 'Funeral services',
    description:
      'Send a message to the centre about funeral support. This inbox is not an emergency service.',
  },
  {
    slug: 'hall-booking',
    title: 'Hall booking enquiry',
    page: '/services/hall-booking',
    pageName: 'Hall booking',
    description:
      'Tell us your preferred date, time and event details. Staff will check availability before confirming.',
  },
  {
    slug: 'community-enquiry',
    title: 'Community enquiry',
    page: '/services/community',
    pageName: 'Community services',
    description: 'Ask about community support or activities at JIC.',
  },
];

export const serviceEnquiry = (slug) =>
  SERVICE_ENQUIRIES.find((item) => item.slug === slug) || null;
export function serviceEnquiryForPath(path) {
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (
    [
      '/funerals',
      '/funerals/what-to-do',
      '/funerals/contact-support',
      '/services/funeral-services',
    ].includes(pathname)
  )
    return serviceEnquiry('funeral-enquiry');
  if (pathname === '/services/community-services') return serviceEnquiry('community-enquiry');
  return SERVICE_ENQUIRIES.find((item) => item.page === pathname) || null;
}

const pad = (value) => String(value).padStart(2, '0');
export function hallMonthRange(year, month) {
  return {
    first: `${year}-${pad(month + 1)}-01`,
    last: `${year}-${pad(month + 1)}-${new Date(year, month + 1, 0).getDate()}`,
  };
}

export function hallDateStatus(rows, date) {
  const entries = rows.filter((row) => row.booking_date === date);
  const allDay = entries.filter((row) => !row.start_time && !row.end_time);
  for (const status of ['closed', 'booked', 'pending']) {
    if (allDay.some((row) => row.status === status)) return status;
  }
  if (entries.some((row) => row.start_time || row.end_time)) return 'partial';
  return allDay.some((row) => row.status === 'available') ? 'available' : 'unknown';
}

export function hallFormPrefill(slug, search) {
  if (slug !== 'hall-booking') return {};
  const date = new URLSearchParams(search).get('date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return {};
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? { preferred_date: date }
    : {};
}
