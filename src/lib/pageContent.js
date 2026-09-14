export const PAGE_PLACEMENTS = [
  ['/education', 'Education overview'],
  ['/education/courses', 'Adult courses & classes'],
  ['/madrassah', 'Madrasah'],
  ['/youth', 'Youth overview'],
  ['/youth/classes-skills', 'Youth classes & skills'],
  ['/worship', 'Worship'],
  ['/services', 'Services'],
  ['/about', 'About'],
  ['/projects', 'Building works'],
];
export const PAGE_KINDS = [
  ['page', 'Information page'], ['course', 'Course / class'], ['activity', 'Activity'],
  ['talk', 'Talk'], ['event', 'Event / gathering'], ['announcement', 'Announcement'],
];
export const REGISTRATION_TYPES = [
  ['none', 'No registration'], ['interest', 'Register interest'],
  ['application', 'Application required'], ['registration', 'Registration required'],
];
export const formStatus = (form) => !form?.published_version ? 'Draft' : form.enabled ? 'Live' : 'Closed';
export const pageUrl = (page) => `/pages/${encodeURIComponent(page.slug)}`;
export const pageSlug = (title) => String(title || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '');
export function pageDraft(poster) {
  return {
    slug: poster?.id || pageSlug(poster?.title), title: poster?.title || '',
    body: poster?.detail || '', image_url: poster?.image || '', schedule: poster?.schedule || '',
    source_poster_id: poster?.id || null, placement: '/education', kind: 'page',
    registration: 'none', form_id: null, published: false,
  };
}
export function pageProblem(page) {
  if (!page.title?.trim() || page.title.length > 160) return 'Add a title of up to 160 characters.';
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(page.slug)) return 'Use a 3–80 character address with lowercase letters, numbers and hyphens.';
  if (!PAGE_PLACEMENTS.some(([path]) => path === page.placement)) return 'Choose where this page appears.';
  if (!PAGE_KINDS.some(([kind]) => kind === page.kind)) return 'Choose the page type.';
  if (!REGISTRATION_TYPES.some(([kind]) => kind === page.registration)) return 'Choose whether registration is needed.';
  if ((page.body || '').length > 12000 || (page.schedule || '').length > 400) return 'Shorten the page text.';
  if (page.image_url) {
    try {
      if (!(page.image_url.startsWith('/') || page.image_url.startsWith('https://')) || /[\s\\]/.test(page.image_url) || page.image_url.length > 2000) throw new Error();
      const url = new URL(page.image_url, 'https://site.invalid');
      if (url.protocol !== 'https:' || url.username || url.password || page.image_url.startsWith('//')) throw new Error();
    } catch { return 'Use an HTTPS picture address or an existing site image.'; }
  }
  return '';
}
export function workflowChanged() {
  window.dispatchEvent(new Event('content-workflow-updated'));
}
