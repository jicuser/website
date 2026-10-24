const CONTENT_LIMIT = 200000;
export const PAGE_PREVIEW_EVENT = 'jic-page-preview';

const text = (value, limit) => (typeof value === 'string' ? value.slice(0, limit) : '');
const slug = (value) =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(value) ? value : '';
const placements = new Set([
  '/education',
  '/education/courses',
  '/madrassah',
  '/youth',
  '/youth/classes-skills',
  '/worship',
  '/services',
  '/about',
  '/projects',
]);

/** Only public display fields cross the read-only preview boundary. */
export function sanitizePreviewPage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  let image = text(value.image_url, 2000);
  try {
    const url = new URL(image, 'https://preview.invalid');
    if (
      !/^(\/[^/]|https:\/\/)/.test(image) ||
      /[\s\\]/.test(image) ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password
    )
      image = '';
  } catch {
    image = '';
  }
  const formSlug = slug(value.form?.slug);
  return {
    slug: slug(value.slug) || 'draft-page',
    title: text(value.title, 160) || 'Untitled page',
    body: text(value.body, 12000),
    schedule: text(value.schedule, 400),
    image_url: image,
    placement: placements.has(value.placement) ? value.placement : '/education',
    kind: ['page', 'course', 'activity', 'talk', 'event', 'announcement'].includes(value.kind)
      ? value.kind
      : 'page',
    registration: ['interest', 'application', 'registration'].includes(value.registration)
      ? value.registration
      : 'none',
    published: value.published === true,
    form: formSlug ? { slug: formSlug, open: value.form.open === true } : null,
  };
}

/** Read-only drafts are accepted only from this iframe's same-origin parent. */
export function installPagePreviewBridge(onContent) {
  if (
    window.parent === window ||
    new URLSearchParams(window.location.search).get('preview') !== '1'
  )
    return () => {};
  const pathname = window.location.pathname;
  const receive = (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const value = event.data;
    if (value?.type !== PAGE_PREVIEW_EVENT || value.path !== pathname) return;
    const content = Object.fromEntries(
      Object.entries(value.content || {}).filter(
        ([key, text]) =>
          [`page:${pathname}`, 'hall_details', 'site_design'].includes(key) &&
          typeof text === 'string' &&
          text.length <= CONTENT_LIMIT,
      ),
    );
    if (['light', 'dark'].includes(value.appearance)) {
      document.documentElement.classList.toggle('dark', value.appearance === 'dark');
      document.documentElement.dataset.theme = value.appearance;
    }
    const sections = Array.isArray(value.sections) ? value.sections.slice(0, 24) : null;
    const page = pathname.startsWith('/pages/') ? sanitizePreviewPage(value.page) : null;
    window.__jicPagePreview = { path: pathname, sections, page };
    onContent(content);
    window.dispatchEvent(new CustomEvent(PAGE_PREVIEW_EVENT));
  };
  window.addEventListener('message', receive);
  window.parent.postMessage(
    { type: 'jic-page-preview-ready', path: pathname },
    window.location.origin,
  );
  return () => {
    window.removeEventListener('message', receive);
    delete window.__jicPagePreview;
  };
}
