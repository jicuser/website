import { EDITABLE_PAGES } from '../content/editablePages.js';

export const BLOCK_LIMIT = 60;
export const GALLERY_LIMIT = 12;

export function newPageBlock(pagePath, id) {
  return {
    id,
    isNew: true,
    page_path: pagePath,
    section_key: `block-${id}`,
    title: '',
    body: '',
    background_image_url: '',
    image_urls: [],
    published: false,
  };
}

export function movePageBlock(rows, id, targetIndex) {
  const from = rows.findIndex((row) => row.id === id);
  if (from < 0 || targetIndex < 0 || targetIndex >= rows.length || from === targetIndex)
    return rows;
  const next = [...rows];
  next.splice(targetIndex, 0, next.splice(from, 1)[0]);
  return next;
}

export function blockPayload(row) {
  return {
    id: row.isNew ? null : row.id,
    section_key: row.section_key,
    page_path: row.page_path,
    title: (row.title || '').trim(),
    body: row.body || '',
    background_image_url: row.background_image_url || '',
    image_urls: row.image_urls || [],
    published: Boolean(row.published),
  };
}

export const blockBaseline = (rows) => rows.map(({ id, updated_at }) => ({ id, updated_at }));

export function blocksChanged(rows, baseline) {
  return (
    rows.some((row) => row.isNew || row.backgroundFile || row.galleryFiles?.length) ||
    JSON.stringify(rows.map(blockPayload)) !== JSON.stringify(baseline.map(blockPayload))
  );
}

function safeImage(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url, 'https://site.invalid');
    return (
      (url.startsWith('https://') || (url.startsWith('/') && !url.startsWith('//'))) &&
      !/[\s\\]/.test(url) &&
      url.length <= 2000 &&
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function pageBlocksProblem(rows) {
  if (rows.length > BLOCK_LIMIT) return `Keep a page to ${BLOCK_LIMIT} content blocks.`;
  for (const row of rows) {
    if (!row.title?.trim() || row.title.length > 160)
      return 'Give each block a heading of up to 160 characters.';
    if ((row.body || '').length > 12000)
      return `Shorten the information in “${row.title}” to 12,000 characters.`;
    if (!EDITABLE_PAGES.some((page) => page.path === row.page_path))
      return 'Choose an existing website page for each block.';
    if (
      !Array.isArray(row.image_urls) ||
      row.image_urls.length + (row.galleryFiles?.length || 0) > GALLERY_LIMIT
    )
      return `Use up to ${GALLERY_LIMIT} gallery pictures in each block.`;
    if (!safeImage(row.background_image_url) || !row.image_urls.every(safeImage))
      return 'Use HTTPS or existing site images.';
  }
  return '';
}

// Retry a failed save without uploading the same File twice. Database writes
// happen only after every picture is ready; uploaded assets are not auto-deleted
// because another saved page could already be using them.
export async function preparePageBlocks(rows, upload, uploaded = new Map()) {
  const picture = async (file, folder) => {
    if (!uploaded.has(file)) uploaded.set(file, await upload(file, folder));
    return uploaded.get(file);
  };
  const prepared = [];
  for (const row of rows) {
    const payload = blockPayload(row);
    if (row.backgroundFile)
      payload.background_image_url = await picture(row.backgroundFile, 'sections/backgrounds');
    for (const file of row.galleryFiles || []) {
      payload.image_urls = [...payload.image_urls, await picture(file, 'sections/gallery')];
    }
    prepared.push(payload);
  }
  return prepared;
}
