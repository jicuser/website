import { COMMUNITY_SERVICES } from '../../content/communityServices.js';
import { isPageVisible } from '../../lib/pageVisibility.js';

/** Shared public destinations for the homepage and services directory. */
export const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All services' },
  { id: 'support', label: 'Support' },
  { id: 'life-events', label: 'Life events' },
  { id: 'learning', label: 'Learning & work' },
  { id: 'community', label: 'Taking part' },
];

export const SERVICE_CATALOG = COMMUNITY_SERVICES;

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
