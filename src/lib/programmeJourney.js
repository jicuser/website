import { PAGE_PLACEMENTS, pageUrl } from './pageContent.js';

const validSlug = (value) =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(value);

// A programme reference is a slug, never a caller-supplied return URL.
export function programmeSlugFromSearch(search) {
  const values = new URLSearchParams(search).getAll('programme');
  return values.length === 1 && validSlug(values[0]) ? values[0] : null;
}

export function programmeJourney(page) {
  if (
    !page ||
    !validSlug(page.slug) ||
    typeof page.title !== 'string' ||
    !page.title.trim() ||
    !PAGE_PLACEMENTS.some(([path]) => path === page.placement)
  )
    return null;
  return {
    slug: page.slug,
    title: page.title,
    placement: page.placement,
    to: pageUrl(page),
  };
}

export function programmeRegistrationPath(page) {
  if (!programmeJourney(page) || !validSlug(page.form?.slug)) return null;
  return `/forms/${page.form.slug}?programme=${page.slug}`;
}

// get_site_page provides the published form relationship. The public page list
// does not, so it cannot establish that a programme belongs to this form.
export function programmeForForm(page, formSlug, requestedSlug) {
  if (
    !validSlug(requestedSlug) ||
    page?.slug !== requestedSlug ||
    !validSlug(formSlug) ||
    page.form?.slug !== formSlug
  )
    return null;
  return programmeJourney(page);
}
