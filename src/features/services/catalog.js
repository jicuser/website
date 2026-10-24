import { isPageVisible } from '../../lib/pageVisibility.js';

/** Shared public destinations for the homepage and services directory. */
export const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All services' },
  { id: 'prayer', label: 'Worship' },
  { id: 'learning', label: 'Learning' },
  { id: 'life-events', label: 'Life events' },
  { id: 'community', label: 'Community' },
  { id: 'giving', label: 'Giving' },
  { id: 'account', label: 'My account' },
];

export const SERVICE_CATALOG = [
  {
    id: 'support',
    title: 'Support & Wellbeing',
    description: 'Practical help, wellbeing and connection.',
    category: 'community',
    to: '/services/support',
    icon: 'support',
    keywords: ['help', 'food', 'housing', 'money', 'loneliness', 'grief', 'wellbeing'],
  },
  {
    id: 'family',
    title: 'Marriage & Family',
    description: 'Nikah, preparation and family questions.',
    category: 'life-events',
    to: '/services/marriage-family',
    icon: 'heart',
    keywords: ['marriage', 'nikah', 'nikkah', 'wedding', 'parenting', 'relationship'],
  },
  {
    id: 'careers',
    title: 'Skills & Careers',
    description: 'CVs, jobs, interviews and training.',
    category: 'learning',
    to: '/services/skills-careers',
    icon: 'briefcase',
    keywords: [
      'work',
      'cv',
      'resume',
      'job',
      'employment',
      'training',
      'apprenticeship',
      'interview',
    ],
  },
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
    title: 'Education & Madrassah',
    eyebrow: 'Keep learning',
    description: 'Children’s learning, adult classes and enrolment.',
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
    description: 'Contacts, arrangements and prayer guidance.',
    category: 'life-events',
    to: '/funerals',
    action: 'Find funeral support',
    icon: 'support',
    keywords: ['bereavement', 'burial', 'death', 'family', 'janaza', 'help'],
  },
  {
    id: 'hall',
    title: 'Hall Hire',
    eyebrow: 'Make room to gather',
    description: 'Venue details and your preferred date.',
    category: 'life-events',
    to: '/services/hall-booking',
    action: 'Enquire about the hall',
    icon: 'calendar',
    keywords: ['booking', 'hire', 'venue', 'event', 'meeting', 'space'],
  },
  {
    id: 'youth',
    title: 'Youth & Events',
    eyebrow: 'Belong, learn and take part',
    description: 'Activities, gatherings and learning.',
    category: 'community',
    to: '/youth',
    action: 'Explore youth activities',
    icon: 'sparkles',
    keywords: ['young people', 'teenager', 'activities', 'itikaf', 'skills', 'volunteer'],
  },
  {
    id: 'community',
    title: 'Volunteering',
    eyebrow: 'A place to belong',
    description: 'Offer time, skills or fundraising help.',
    category: 'community',
    to: '/get-involved/volunteer',
    action: 'Find a way to take part',
    icon: 'users',
    keywords: [
      'help',
      'volunteer',
      'volunteering',
      'campaign',
      'fundraising',
      'fundraiser',
      'take part',
    ],
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
    keywords: ['donation', 'donate', 'charity', 'sadaqah', 'giving'],
  },
  {
    id: 'portal',
    title: 'Your JIC account',
    eyebrow: 'Your connection to the centre',
    description: 'View your issued certificates, records and requests in your portal.',
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
      'certificates',
      'record',
      'request',
      'parent',
    ],
  },
  {
    id: 'adhkar',
    title: 'Adhkar & Du’as',
    description: 'Daily reading, meaning and transliteration.',
    category: 'prayer',
    to: '/worship/daily-duas',
    icon: 'book',
    keywords: ['adhkar', 'adkar', 'dhikr', 'dua', 'morning', 'evening', 'azkar'],
  },
  {
    id: 'quran',
    title: 'Read Qur’an',
    description: 'Choose a surah and continue reading.',
    category: 'prayer',
    to: '/worship/quran',
    icon: 'book',
    keywords: ['quran', 'koran', 'surah', 'reading'],
  },
  {
    id: 'salah-guide',
    title: 'Salah Guide',
    description: 'Prayer method and a short refresher.',
    category: 'prayer',
    to: '/worship/prayer-guide',
    icon: 'mosque',
    keywords: ['wudu', 'salah', 'namaz', 'prayer', 'learn'],
  },
  {
    id: 'janazah-guide',
    title: 'Janazah Prayer Guide',
    description: 'Prepare to attend the prayer.',
    category: 'prayer',
    to: '/worship/janazah-guide',
    icon: 'book',
    keywords: ['funeral', 'janazah', 'janaza', 'recitations', 'urdu'],
  },
  {
    id: 'dalail',
    title: 'Dala’il al-Khayrat',
    description: 'Reading programme information.',
    category: 'prayer',
    to: '/worship/dalail-al-khayrat',
    icon: 'book',
    keywords: ['dalail', 'salawat', 'durood', 'reading'],
  },
  {
    id: 'ramadan',
    title: 'Ramadan',
    description: 'Suhoor, Iftar sponsorship and giving.',
    category: 'giving',
    to: '/ramadan',
    icon: 'calendar',
    keywords: ['ramadhan', 'iftar', 'suhoor', 'sehri', 'sponsor', 'meal'],
  },
];

export const HUB_PRIMARY_IDS = [
  'support',
  'family',
  'funerals',
  'learning',
  'careers',
  'youth',
  'community',
  'hall',
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
