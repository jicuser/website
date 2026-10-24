export const NIKAH_VENUE_KEY = 'nikah_venue';
export const VENUE_PHOTO_LIMIT = 6;
export const NIKAH_AREAS = [
  { id: 'mens_hall', title: 'Men’s hall', group: 'facilities', icon: 'hall' },
  { id: 'ladies_hall', title: 'Ladies’ hall', group: 'facilities', icon: 'hall' },
  { id: 'kitchen', title: 'Kitchen & serving area', group: 'facilities', icon: 'kitchen' },
  { id: 'decorations', title: 'Previous decorations', group: 'examples', icon: 'decorations' },
  { id: 'parking', title: 'Parking on the day', group: 'parking', icon: 'parking' },
];

const text = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
export function venueImageUrl(value) {
  if (typeof value !== 'string' || value.length > 2000 || /[\s\\]/.test(value)) return '';
  if (!/^(\/[^/]|https:\/\/)/.test(value)) return '';
  try {
    const url = new URL(value, 'https://site.invalid');
    return url.protocol === 'https:' && !url.username && !url.password ? value : '';
  } catch {
    return '';
  }
}

/** Keep real photographs and published notes separate from the empty photo slots. */
export function readNikahVenue(raw) {
  let value;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    value = null;
  }
  return Object.fromEntries(
    NIKAH_AREAS.map(({ id }) => {
      const area = value?.[id];
      return [
        id,
        {
          visible: area?.visible !== false,
          description: text(area?.description, 1200),
          photos: Array.isArray(area?.photos)
            ? area.photos
                .filter((photo) => venueImageUrl(photo?.url))
                .slice(0, VENUE_PHOTO_LIMIT)
                .map((photo) => ({ url: photo.url, alt: text(photo.alt, 200) }))
            : [],
        },
      ];
    }),
  );
}
