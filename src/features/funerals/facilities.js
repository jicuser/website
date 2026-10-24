export const FUNERAL_FACILITIES_KEY = 'funeral_facilities';

export const FUNERAL_FACILITIES = [
  {
    id: 'ambulance',
    title: 'Ambulance collection',
    description: 'Collection and transfer of your loved one.',
  },
  { id: 'hearse', title: 'Hearse', description: 'Transport for the funeral and burial.' },
  {
    id: 'washing',
    title: 'Washing area',
    description: 'A dedicated space for ghusl and preparation.',
  },
  { id: 'cold-room', title: 'Cold room', description: 'Care before the funeral takes place.' },
  {
    id: 'prayer-hall',
    title: 'Janazah prayer hall',
    description: 'Space for family and community prayers.',
  },
  {
    id: 'family-room',
    title: 'Family & viewing room',
    description: 'A quiet space for family to gather and pay their respects.',
  },
];

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function funeralImageUrl(value) {
  const image = text(value, 2000);
  if (!image || /[\s\\]/.test(image)) return '';
  try {
    const url = new URL(image, 'https://site.invalid');
    return /^(\/[^/]|https:\/\/)/i.test(image) &&
      url.protocol === 'https:' &&
      !url.username &&
      !url.password
      ? image
      : '';
  } catch {
    return '';
  }
}

/** Fixed facility identities; only public display text and safe image URLs are editable. */
export function readFuneralFacilities(raw) {
  let value;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    value = null;
  }
  return FUNERAL_FACILITIES.map((item) => {
    const saved = Array.isArray(value) ? value.find((entry) => entry?.id === item.id) : null;
    return {
      ...item,
      title: text(saved?.title, 80) || item.title,
      description: text(saved?.description, 240) || item.description,
      image: funeralImageUrl(saved?.image),
      alt: text(saved?.alt, 160),
      visible: saved?.visible !== false,
    };
  });
}
