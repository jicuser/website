export const HALL_DETAILS_KEY = 'hall_details';
export const EMPTY_HALL_DETAILS = {
  description: '',
  capacity: '',
  facilities: [],
  photos: [],
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const imageUrl = (value) => {
  if (!value || /[\s\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

/** Empty fields stay empty until the centre publishes verified venue details. */
export function readHallDetails(raw) {
  let value;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    value = null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_HALL_DETAILS };
  return {
    description: text(value.description),
    capacity: text(value.capacity),
    facilities: Array.isArray(value.facilities)
      ? value.facilities.map(text).filter(Boolean).slice(0, 16)
      : [],
    photos: Array.isArray(value.photos)
      ? value.photos
          .filter((photo) => photo && imageUrl(text(photo.url)))
          .slice(0, 8)
          .map((photo) => ({ url: text(photo.url), alt: text(photo.alt) }))
      : [],
  };
}
