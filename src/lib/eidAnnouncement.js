export const EID_ANNOUNCEMENT_KEY = 'eid_announcement';

export function parseEidAnnouncement(raw) {
  let value;
  try {
    value = JSON.parse(raw || '{}');
  } catch {
    value = null;
  }
  const text = (item, limit) => typeof item === 'string' ? item.trim().slice(0, limit) : '';
  return {
    enabled: value?.enabled === true,
    title: text(value?.title, 80) || 'Eid announcement',
    message: text(value?.message, 360),
  };
}

export function publishedEidAnnouncement(raw) {
  const announcement = parseEidAnnouncement(raw);
  return announcement.enabled && announcement.message ? announcement : null;
}
