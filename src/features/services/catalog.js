import { isPageVisible } from '../../lib/pageVisibility.js';

/** Shared public destinations for the homepage and services directory. */
export const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All services' },
  { id: 'prayer', label: 'Prayer' },
  { id: 'learning', label: 'Learning' },
  { id: 'life-events', label: 'Life events' },
  { id: 'community', label: 'Community' },
  { id: 'giving', label: 'Giving' },
  { id: 'account', label: 'My account' },
];

export const SERVICE_CATALOG = [
  {
    id: 'prayer',
    title: 'Prayer times',
    eyebrow: 'Come together in worship',
    description: 'Today’s prayer and Jama’ah times, plus the monthly timetable.',
    category: 'prayer',
    to: '/prayer-times',
    action: 'View prayer times',
    icon: 'mosque',
    keywords: ['salah', 'namaz', 'jamaat', 'jamaah', 'jummah', 'friday', 'timetable', 'worship'],
  },
  {
    id: 'learning',
    title: 'Adult learning',
    eyebrow: 'Keep learning',
    description: 'Browse adult classes and find out how to register.',
    category: 'learning',
    to: '/education',
    action: 'Explore learning',
    icon: 'book',
    keywords: ['education', 'course', 'class', 'quran', 'tajweed', 'islamic studies', 'enrol'],
  },
  {
    id: 'madrassah',
    title: 'Madrassah',
    eyebrow: 'A foundation for young minds',
    description: 'Explore classes, enrolment and information for parents.',
    category: 'learning',
    to: '/madrassah',
    action: 'Visit the Madrassah',
    icon: 'graduation',
    keywords: ['children', 'child', 'pupil', 'student', 'parent', 'quran', 'school', 'madrasa'],
  },
  {
    id: 'nikah',
    title: 'Nikah',
    eyebrow: 'Begin your next chapter',
    description: 'Understand the ceremony, prepare your details and enquire about a date.',
    category: 'life-events',
    to: '/services/nikah',
    action: 'Plan a Nikah enquiry',
    icon: 'heart',
    keywords: ['marriage', 'wedding', 'nikkah', 'ceremony', 'family'],
  },
  {
    id: 'funerals',
    title: 'Janazah & funeral support',
    eyebrow: 'Here when you need us',
    description: 'Find who to contact and what to prepare for a Janazah enquiry.',
    category: 'life-events',
    to: '/funerals',
    action: 'Find funeral support',
    icon: 'support',
    keywords: ['bereavement', 'burial', 'death', 'family', 'janaza', 'help'],
  },
  {
    id: 'hall',
    title: 'Hall enquiries',
    eyebrow: 'Make room to gather',
    description: 'Check the hall calendar and send your preferred date to the team.',
    category: 'life-events',
    to: '/services/hall-booking',
    action: 'Enquire about the hall',
    icon: 'calendar',
    keywords: ['booking', 'hire', 'venue', 'event', 'meeting', 'space'],
  },
  {
    id: 'certificates',
    title: 'Certificates',
    eyebrow: 'Your JIC records',
    description: 'Find certificate guidance and learn how to prepare a request.',
    category: 'account',
    to: '/services/certificates',
    action: 'Read the certificate guide',
    icon: 'account',
    keywords: ['certificate', 'certificates', 'record', 'document', 'guidance', 'request'],
  },
  {
    id: 'youth',
    title: 'Youth at JIC',
    eyebrow: 'Belong, learn and take part',
    description: 'Find youth activities, learning and ways to get involved.',
    category: 'community',
    to: '/youth',
    action: 'Explore youth activities',
    icon: 'sparkles',
    keywords: ['young people', 'teenager', 'activities', 'itikaf', 'skills', 'volunteer'],
  },
  {
    id: 'community',
    title: 'Community support',
    eyebrow: 'A place to belong',
    description: 'Ask about support, share your skills or enquire about volunteering.',
    category: 'community',
    to: '/services/community',
    action: 'Connect with the centre',
    icon: 'users',
    keywords: ['help', 'volunteer', 'volunteering', 'activity', 'family', 'enquiry'],
  },
  {
    id: 'giving',
    title: 'Support JIC',
    eyebrow: 'Give with purpose',
    description: 'Find ways to donate and support the work of the centre.',
    category: 'giving',
    to: '/donate',
    action: 'Explore ways to give',
    icon: 'giving',
    keywords: ['donation', 'donate', 'charity', 'sadaqah', 'fundraising', 'fundraiser', 'giving'],
  },
  {
    id: 'portal',
    title: 'Your JIC account',
    eyebrow: 'Your connection to the centre',
    description: 'Sign in to see the records and requests available to your account.',
    category: 'account',
    to: '/portal',
    action: 'Open the portal',
    icon: 'account',
    keywords: [
      'login',
      'log in',
      'sign in',
      'portal',
      'certificate',
      'record',
      'request',
      'parent',
    ],
  },
];

const defaultContent = (_key, fallback) => fallback;

function normaliseSearch(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Evaluate current CMS switches on every call, including homepage discovery. */
export function getVisibleServices(getContent = defaultContent) {
  return SERVICE_CATALOG.filter(({ to }) => isPageVisible(getContent, to));
}

/** All search words must occur in the same visible service; catalogue order is retained. */
export function filterServices({ category = 'all', query = '', getContent = defaultContent } = {}) {
  const words = normaliseSearch(query).split(' ').filter(Boolean);
  return getVisibleServices(getContent).filter((service) => {
    if (category !== 'all' && service.category !== category) return false;
    const text = normaliseSearch(
      [service.title, service.eyebrow, service.description, ...service.keywords].join(' '),
    );
    return words.every((word) => text.includes(word));
  });
}
