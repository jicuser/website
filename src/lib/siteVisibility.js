import { pageVisibilityKey } from './pageVisibility.js';
export async function saveSiteVisibility(client, page, visible) {
  const path = pageVisibilityKey(page.path).replace('page-visibility:', '');
  const { data, error } = await client.rpc('save_site_visibility', {
    p_path: path,
    p_visible: visible,
    p_page_id: page.id || null,
  });
  if (error || data !== visible)
    throw new Error(error?.message || 'Page visibility was not saved.');
  return data;
}
