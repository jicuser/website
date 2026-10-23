import { validateBuildSettings } from './build-settings.mjs';
import { isPrivatePage, previewText } from '../src/lib/pageMetadata.js';

const slugPattern = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, limit) => typeof value === 'string' && value.length <= limit;
const fail = (name, reason) => {
  // Never include API bodies, caller-provided values or credentials in build logs.
  throw new Error(
    `Public page previews: ${name} ${reason}. Build stopped; check the public API and rebuild.`,
  );
};
const published = (row) => row.published !== false && row.enabled !== false;

function validateRecord(row, name) {
  if (
    !object(row) ||
    !text(row.slug, 80) ||
    !slugPattern.test(row.slug) ||
    !text(row.title, 160) ||
    !row.title.trim()
  )
    fail(name, 'returned invalid metadata');
}

// Read only the same anonymous, published APIs used by the public website.
// In particular, custom_forms contains editable drafts; list_public_forms
// returns the immutable published title and introduction instead.
export async function loadPublicPageMetadata({
  env,
  fetchImpl = globalThis.fetch,
  warn = () => {},
  timeoutMs = 10000,
}) {
  if (![undefined, '', 'on', 'off'].includes(env.JIC_PUBLIC_PREVIEWS))
    fail('JIC_PUBLIC_PREVIEWS', 'must be on or off');
  if (env.JIC_PUBLIC_PREVIEWS === 'off') {
    warn('Public page previews are disabled for this offline build (JIC_PUBLIC_PREVIEWS=off).');
    return { source: 'disabled', records: [] };
  }
  validateBuildSettings(env);

  async function rpc(name, body = {}) {
    let response;
    try {
      response = await fetchImpl(
        `${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`,
        {
          method: 'POST',
          headers: {
            apikey: env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'error',
        },
      );
    } catch {
      fail(name, 'request failed (network or timeout)');
    }
    if (!response.ok) fail(name, `request failed (HTTP ${response.status})`);
    try {
      return await response.json();
    } catch {
      fail(name, 'returned an invalid JSON response');
    }
  }

  async function catalogue(name, limit) {
    const rows = await rpc(name);
    if (!Array.isArray(rows) || rows.some((row) => !object(row)))
      fail(name, 'returned an invalid response');
    if (rows.length >= limit)
      warn(
        `Public page previews: ${name} reached its ${limit}-record API limit; add pagination before this catalogue grows further.`,
      );
    return rows;
  }

  const lists = await Promise.allSettled([
    catalogue('list_public_forms', 200),
    catalogue('list_site_pages', 200),
    catalogue('public_community_campaigns', 100),
  ]);
  const error = lists.find((result) => result.status === 'rejected');
  if (error) throw error.reason;
  const [forms, pages, campaigns] = lists.map((result) => result.value);
  const records = [];

  for (const row of forms.filter(published)) {
    validateRecord(row, 'list_public_forms');
    if (!Number.isInteger(row.version) || row.version < 1 || !text(row.description, 4000))
      fail('list_public_forms', 'returned invalid metadata');
    records.push({
      path: `/forms/${row.slug}`,
      title: row.title.trim(),
      description: previewText(row.description),
    });
  }

  const visiblePages = pages.filter(published);
  for (const row of visiblePages) validateRecord(row, 'list_site_pages');
  // The page catalogue deliberately omits the body. Fetch published details in
  // bounded batches, rechecking publication if a page is withdrawn mid-build.
  for (let offset = 0; offset < visiblePages.length; offset += 6) {
    const details = await Promise.allSettled(
      visiblePages.slice(offset, offset + 6).map(async ({ slug }) => {
        const row = await rpc('get_site_page', { p_slug: slug });
        if (row === null || (object(row) && !published(row))) return null;
        validateRecord(row, 'get_site_page');
        if (
          row.slug !== slug ||
          !text(row.schedule, 400) ||
          !text(row.body, 12000) ||
          !text(row.image_url, 2000)
        )
          fail('get_site_page', 'returned invalid metadata');
        return {
          path: `/pages/${slug}`,
          title: row.title.trim(),
          description: previewText(`${row.schedule} ${row.body}`),
          image: row.image_url,
        };
      }),
    );
    for (const result of details) {
      if (result.status === 'rejected') throw result.reason;
      if (result.value) records.push(result.value);
    }
  }

  for (const row of campaigns.filter((row) => ['published', 'closed'].includes(row.status))) {
    validateRecord(row, 'public_community_campaigns');
    if (!text(row.story, 4000)) fail('public_community_campaigns', 'returned invalid metadata');
    records.push({
      path: `/fundraise/${row.slug}`,
      title: row.title.trim(),
      description: previewText(row.story),
    });
  }
  if (new Set(records.map(({ path }) => path)).size !== records.length)
    fail('the public API', 'returned duplicate metadata paths');
  if (records.some(({ path }) => isPrivatePage(path)))
    fail('the public API', 'returned a reserved metadata path');
  return { source: 'public-api', records: records.sort((a, b) => a.path.localeCompare(b.path)) };
}
