export const READING_COLLECTIONS = ['dalail', 'dhikr', 'hadith', 'hizb'];
export function publicAssetUrl(value) {
  if (typeof value !== 'string' || value.length > 2000 || /[\s\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function validReadingEntry(entry) {
  return Boolean(
    entry &&
    typeof entry.id === 'string' &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(entry.id) &&
    READING_COLLECTIONS.includes(entry.collection) &&
    typeof entry.title === 'string' &&
    entry.title.trim() &&
    entry.title.length <= 200 &&
    typeof entry.text === 'string' &&
    entry.text.trim() &&
    entry.text.length <= 30000 &&
    typeof entry.reference === 'string' &&
    entry.reference.trim() &&
    entry.reference.length <= 500 &&
    typeof entry.source === 'string' &&
    publicAssetUrl(entry.source),
  );
}
