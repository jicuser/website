/** Public layout preferences only; page visibility and account access remain separate. */
export const HUB_LAYOUT_KEY = 'community_hub_layout_v1';
export const HUB_TONES = ['teal', 'gold', 'rose', 'indigo'];
export const HUB_GROUPS = [
  { id: 'funerals', title: 'Janazah & Funerals', description: 'Arrangements, facilities and guidance.', category: 'life-events', icon: 'support', tone: 'teal', members: ['funerals', 'janazah-guide'] },
  { id: 'family', title: 'Nikah & Family', description: 'Marriage, ceremonies and family support.', category: 'life-events', icon: 'heart', tone: 'rose', members: ['family', 'nikah'] },
  { id: 'worship', title: 'Worship & Adhkar', description: 'Qur’an, du’as and everyday worship.', category: 'prayer', icon: 'book', tone: 'gold', overview: '/worship', members: ['adhkar', 'quran', 'salah-guide', 'dalail'] },
  { id: 'learning', title: 'Education & Madrassah', description: 'Children, adults and Islamic learning.', category: 'learning', icon: 'graduation', tone: 'indigo', members: ['learning', 'madrassah'] },
  { id: 'youth', title: 'Youth & Events', description: 'Activities, gatherings and programmes.', category: 'community', icon: 'users', tone: 'teal', members: ['youth'] },
  { id: 'support', title: 'Support & Wellbeing', description: 'Practical help, advice and care.', category: 'community', icon: 'support', tone: 'rose', members: ['support'] },
  { id: 'careers', title: 'Skills & Careers', description: 'Work, CVs, interviews and training.', category: 'learning', icon: 'briefcase', tone: 'indigo', members: ['careers'] },
  { id: 'hall', title: 'Hall & Facilities', description: 'Explore spaces and enquire to book.', category: 'life-events', icon: 'building', tone: 'gold', members: ['hall'] },
];
const ids = HUB_GROUPS.map(({ id }) => id);
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

/** No executable, mixed-content, credential-bearing or protocol-relative image URLs. */
export function safeHubImage(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/u.test(value)) return '';
  if (/^\/(?!\/)/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function normaliseHubLayout(input) {
  let raw = input;
  if (typeof input === 'string') {
    try { raw = JSON.parse(input); } catch { raw = {}; }
  }
  raw = record(raw);
  const order = Array.isArray(raw.order) ? raw.order.filter((id) => ids.includes(id)) : [];
  const hidden = Array.isArray(raw.hidden) ? raw.hidden : [];
  const colours = record(raw.colours);
  const images = record(raw.images);
  return {
    version: 1,
    order: [...new Set([...order, ...ids])],
    hidden: ids.filter((id) => hidden.includes(id)),
    colours: Object.fromEntries(HUB_GROUPS.map(({ id, tone }) => [id, HUB_TONES.includes(colours[id]) ? colours[id] : tone])),
    images: Object.fromEntries(ids.map((id) => [id, safeHubImage(images[id])])),
    quickLinks: raw.quickLinks !== false,
  };
}

/** Only already-visible catalogue records may become destinations or group members. */
export function buildHubCards(services = [], input, isVisible = () => true) {
  const layout = normaliseHubLayout(input);
  const available = new Map((Array.isArray(services) ? services : []).map((service) => [service.id, service]));
  return layout.order.flatMap((id) => {
    if (layout.hidden.includes(id)) return [];
    const group = HUB_GROUPS.find((item) => item.id === id);
    const members = group.members.map((memberId) => available.get(memberId)).filter(Boolean);
    if (!members.length) return [];
    return [{
      ...group,
      tone: layout.colours[id],
      image: layout.images[id],
      to: group.overview && isVisible(group.overview) ? group.overview : members[0].to,
      serviceIds: members.map((member) => member.id),
      services: members,
    }];
  });
}

export function moveHubCard(input, id, direction) {
  const layout = normaliseHubLayout(input);
  const from = layout.order.indexOf(id);
  const to = from + direction;
  if (from < 0 || ![-1, 1].includes(direction) || to < 0 || to >= layout.order.length) return layout;
  [layout.order[from], layout.order[to]] = [layout.order[to], layout.order[from]];
  return layout;
}
