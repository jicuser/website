import { SITE } from '../content/site.js';
import { PUBLIC_PAGES, pageName } from '../content/pageDirectory.js';
import { canonicalPagePath } from '../content/pageAliases.js';

export const SITE_ORIGIN = 'https://www.jicmasjid.org';
export const DEFAULT_DESCRIPTION =
  'Prayer times, Islamic classes and community services at Jamatia Islamic Centre, Woodlands Road, Sparkhill, Birmingham.';
export const PREVIEW_IMAGE = `${SITE_ORIGIN}/jic-aerial-sunset.jpg`;

const descriptions = {
  '/': DEFAULT_DESCRIPTION,
  '/about':
    'Learn about Jamatia Islamic Centre, our history and our work serving the community in Sparkhill, Birmingham.',
  '/team':
    'Meet the team serving Jamatia Islamic Centre and its community in Sparkhill, Birmingham.',
  '/contact':
    'Contact Jamatia Islamic Centre, find our Woodlands Road address and send an enquiry to the centre’s team.',
  '/services':
    'Find prayer times, Nikah and funeral support, hall enquiries, classes and community services at Jamatia Islamic Centre.',
  '/services/hall-booking':
    'View the JIC hall availability calendar and send your preferred date and event details to the centre’s team.',
  '/services/nikah':
    'Find out about Nikah ceremonies at Jamatia Islamic Centre and send an enquiry about a date or requirements.',
  '/funerals':
    'Find funeral and Janazah guidance, contact details and support from Jamatia Islamic Centre in Birmingham.',
  '/prayer-times':
    'View today’s Salah start and Jama’ah times, Jummah times and the monthly timetable for Jamatia Islamic Centre, Birmingham.',
  '/prayer-times/monthly':
    'View and download the monthly Salah and Jama’ah timetable for Jamatia Islamic Centre in Sparkhill, Birmingham.',
  '/prayer-times/jummah':
    'Check Friday Jummah times at Jamatia Islamic Centre on Woodlands Road, Sparkhill, Birmingham.',
  '/prayer-times/reminders':
    'Set up Salah reminders for Jamatia Islamic Centre’s prayer and Jama’ah times.',
  '/worship':
    'Explore Qur’an reading, daily du‘as and practical prayer guidance from Jamatia Islamic Centre.',
  '/ramadan':
    'Find Ramadan information, the upcoming timetable, Iftar and Suhoor meal sponsorships and Daily Giving at Jamatia Islamic Centre.',
  '/ramadan/iftar':
    'Choose a Ramadan day to sponsor an Iftar meal for the community at Jamatia Islamic Centre.',
  '/ramadan/suhoor':
    'Choose a Ramadan day to sponsor a Suhoor meal for the community at Jamatia Islamic Centre.',
  '/ramadan/daily-giving':
    'Choose the Ramadan days you would like to support through Daily Giving at Jamatia Islamic Centre.',
  '/education':
    'Discover adult classes, Qur’an learning, Madrassah and educational programmes at Jamatia Islamic Centre in Birmingham.',
  '/education/courses':
    'Explore adult classes and courses at Jamatia Islamic Centre and find programme details and registration information.',
  '/madrassah':
    'Find Madrassah classes, enrolment and information for parents at Jamatia Islamic Centre, Birmingham.',
  '/youth':
    'Explore youth activities, Islamic learning and ways to get involved at Jamatia Islamic Centre.',
  '/donate':
    'Find ways to donate and support the worship, learning and community work of Jamatia Islamic Centre.',
  '/get-involved':
    'Volunteer, join community campaigns and find ways to support Jamatia Islamic Centre.',
  '/fundraise': 'Explore community fundraising campaigns supporting Jamatia Islamic Centre.',
  '/projects':
    'Follow the masjid building project and find ways to support the future of Jamatia Islamic Centre.',
  '/radio':
    'Listen to JIC Radio from Jamatia Islamic Centre. Open the player to check station availability and start listening.',
  '/privacy':
    'Read how Jamatia Islamic Centre handles information submitted through its website and forms.',
  '/social-media': 'Find Jamatia Islamic Centre’s official social channels and community updates.',
};

export function metadataPath(pathname) {
  const path =
    String(pathname || '/')
      .split(/[?#]/)[0]
      .replace(/\/+$/, '') || '/';
  return canonicalPagePath(path.startsWith('/') && !path.startsWith('//') ? path : '/');
}

export function isPrivatePage(pathname) {
  return (
    /^\/(admin|account|portal|verify|tv179|tv)(\/|$)/.test(pathname) ||
    ['/search', '/ramadan/display', '/fundraise/new'].includes(pathname)
  );
}

export const previewText = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 170);

export function pageMetadata(pathname, overrides = {}) {
  const path = metadataPath(pathname);
  const name =
    overrides.title ||
    (path === '/radio' ? 'JIC Radio' : path === '/privacy' ? 'Privacy' : pageName(path));
  const known = path === '/' || !!name;
  let image = PREVIEW_IMAGE;
  try {
    const candidate = new URL(overrides.image || PREVIEW_IMAGE, SITE_ORIGIN);
    if (candidate.protocol === 'https:' && !candidate.username && !candidate.password)
      image = candidate.href;
  } catch {
    /* Use the centre photograph when an image address is invalid. */
  }
  return {
    path,
    title: name && path !== '/' ? `${name} | ${SITE.name}` : SITE.name,
    description:
      previewText(overrides.description) ||
      descriptions[path] ||
      (name
        ? `${name} at Jamatia Islamic Centre in Sparkhill, Birmingham. Find information and contact the centre’s team.`
        : DEFAULT_DESCRIPTION),
    url: `${SITE_ORIGIN}${path === '/' ? '/' : path}`,
    image,
    imageAlt: overrides.image
      ? name || SITE.name
      : 'Jamatia Islamic Centre, Woodlands Road, Birmingham',
    noindex: overrides.noindex ?? (isPrivatePage(path) || !known),
  };
}

export const publicMetadataPaths = [
  ...new Set([...PUBLIC_PAGES.map(({ path }) => path), '/', '/radio', '/privacy']),
].filter((path) => !isPrivatePage(path));

export const centreStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Mosque',
  name: SITE.name,
  url: SITE_ORIGIN,
  image: PREVIEW_IMAGE,
  telephone: '+441217786612',
  email: SITE.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.line1,
    addressLocality: 'Birmingham',
    postalCode: 'B11 4ER',
    addressCountry: 'GB',
  },
  sameAs: Object.values(SITE.socials),
};
