import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../src/content/site.js';
import { SITE_ORIGIN } from '../src/lib/pageMetadata.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let origin = SITE_ORIGIN;
let output = path.join(root, 'public');
for (let index = 0; index < args.length; index += 2) {
  const value = args[index + 1];
  if (!value || !['--origin', '--output'].includes(args[index])) {
    throw new Error('Use --origin https://example.org and/or --output /absolute/static-directory.');
  }
  if (args[index] === '--origin') origin = value;
  else output = path.resolve(value);
}

const originUrl = new URL(origin);
if (
  originUrl.protocol !== 'https:' ||
  originUrl.username ||
  originUrl.password ||
  originUrl.pathname !== '/' ||
  originUrl.search ||
  originUrl.hash
) {
  throw new Error('The public sharing origin must be an HTTPS origin without a path or credentials.');
}
origin = originUrl.origin;

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
const directory = '/downloads/december-2026';
const assets = {
  pdf: `${directory}/timetable.pdf`,
  timetable: `${directory}/timetable.png`,
  wallpaper: `${directory}/phone-wallpaper.png`,
};
const downloadIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>';
const linkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4m-6 8-1 1a4.2 4.2 0 0 1-6-6l5-5a4.2 4.2 0 0 1 6 0m0 10a4.2 4.2 0 0 0 6 0l5-5a4.2 4.2 0 0 0-6-6l-1 1" transform="translate(1 0) scale(.91)"/></svg>';
const shareIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M5 11v10h14V11"/></svg>';

const pages = [
  {
    path: `${directory}/`,
    title: 'December 2026 Prayer Timetable | Jamatia Islamic Centre',
    description:
      'View and download the December 2026 prayer timetable for Jamatia Islamic Centre, Birmingham. Printable PDF, clear timetable image and phone wallpaper.',
    shareTitle: 'December 2026 prayer timetable',
    shareDescription: 'A4 PDF, timetable image and phone wallpaper from Jamatia Islamic Centre.',
    preview: `${directory}/share-timetable.jpg`,
    previewAlt: 'December 2026 prayer timetable from Jamatia Islamic Centre, Birmingham',
    heading: 'December 2026 prayer timetable',
    introduction: 'Salah and Jama’ah times for Jamatia Islamic Centre, Woodlands Road Masjid.',
    image: assets.timetable,
    imageAlt: 'Full December 2026 Jamatia Islamic Centre prayer timetable',
    label: 'Timetable preview',
    imageClass: 'timetable-preview',
    actions: `
          <a class="button button-primary" href="${assets.pdf}" download="JIC-December-2026-Timetable.pdf">${downloadIcon}Download PDF</a>
          <a class="button button-secondary" href="${assets.timetable}" download="JIC-December-2026-Timetable.png">${downloadIcon}Save timetable image</a>
          <a class="format-link" href="${directory}/phone-wallpaper/">Get the phone wallpaper</a>`,
    help: 'The printable PDF includes the timetable and Weekend Madrasa information. Open the image to zoom in on any time.',
    related: `<a href="${directory}/phone-wallpaper/">Phone wallpaper</a>`,
  },
  {
    path: `${directory}/phone-wallpaper/`,
    title: 'December 2026 Prayer Timetable Phone Wallpaper | JIC',
    description:
      'Save the December 2026 Jamatia Islamic Centre prayer timetable as your phone wallpaper. View the full image or download the printable PDF.',
    shareTitle: 'December 2026 phone wallpaper',
    shareDescription: 'Save Jamatia Islamic Centre’s December prayer timetable to your phone.',
    preview: `${directory}/share-wallpaper.jpg`,
    previewAlt: 'December 2026 prayer timetable phone wallpaper from Jamatia Islamic Centre',
    heading: 'December prayer times, on your phone',
    introduction: 'Keep the December 2026 timetable with you as a clear phone wallpaper.',
    image: assets.wallpaper,
    imageAlt: 'December 2026 Jamatia Islamic Centre prayer timetable phone wallpaper',
    label: 'Phone wallpaper preview',
    imageClass: 'wallpaper-preview',
    actions: `
          <a class="button button-primary" href="${assets.wallpaper}" download="JIC-December-2026-Phone-Wallpaper.png">${downloadIcon}Save phone wallpaper</a>
          <a class="button button-secondary" href="${assets.wallpaper}" target="_blank" rel="noopener">Open full-size image</a>
          <a class="format-link" href="${directory}/">Timetable image &amp; printable PDF</a>`,
    help: 'Save the image, then choose it in your phone’s wallpaper settings. Keep the whole timetable visible when positioning it.',
    related: `<a href="${directory}/">Timetable downloads</a><a href="${assets.pdf}">Printable PDF</a>`,
  },
];

for (const page of pages) {
  const image = await readFile(path.join(root, 'public', page.image));
  if (image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`The preview must be a valid PNG: ${page.image}`);
  }
  page.imageWidth = image.readUInt32BE(16);
  page.imageHeight = image.readUInt32BE(20);
}

function render(page) {
  const url = `${origin}${page.path}`;
  const preview = `${origin}${page.preview}`;
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(page.title)}</title>
  <meta name="description" content="${escape(page.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#142d4e">
  <link rel="canonical" href="${escape(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Jamatia Islamic Centre">
  <meta property="og:locale" content="en_GB">
  <meta property="og:title" content="${escape(page.shareTitle)}">
  <meta property="og:description" content="${escape(page.shareDescription)}">
  <meta property="og:url" content="${escape(url)}">
  <meta property="og:image" content="${escape(preview)}">
  <meta property="og:image:secure_url" content="${escape(preview)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escape(page.previewAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(page.shareTitle)}">
  <meta name="twitter:description" content="${escape(page.shareDescription)}">
  <meta name="twitter:image" content="${escape(preview)}">
  <meta name="twitter:image:alt" content="${escape(page.previewAlt)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/downloads/timetable-share.css">
  <script src="/downloads/timetable-share.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to downloads</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${SITE_ORIGIN}/" aria-label="Jamatia Islamic Centre home"><img src="/brand/jic-horizontal-light.svg" width="2620" height="1144" alt="Jamatia Islamic Centre"></a>
      <a class="header-link" href="${SITE_ORIGIN}/prayer-times">Today’s Salah times</a>
    </div>
  </header>
  <main id="main" class="page">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${SITE_ORIGIN}/prayer-times">Salah times</a><span aria-hidden="true">/</span><span>December downloads</span></nav>
    <div class="download-layout">
      <section class="download-content" aria-labelledby="page-title">
        <p class="eyebrow">Woodlands Road Masjid · Birmingham</p>
        <h1 id="page-title">${escape(page.heading)}</h1>
        <p class="introduction">${escape(page.introduction)}</p>
        <div class="download-actions" aria-label="Download formats">${page.actions}
        </div>
        <p class="download-help">${escape(page.help)}</p>
        <section class="share-card" aria-labelledby="share-title">
          <h2 id="share-title">Share with family &amp; friends</h2>
          <p>Copy this page link, or choose WhatsApp from your phone’s share menu.</p>
          <label class="sr-only" for="share-url">Shareable page link</label>
          <input id="share-url" class="share-url" type="url" value="${escape(url)}" readonly spellcheck="false">
          <div class="share-actions">
            <button class="button button-small" type="button" data-copy-link hidden>${linkIcon}Copy link</button>
            <button class="button button-small" type="button" data-share-link hidden>${shareIcon}Share</button>
          </div>
          <p class="share-status" role="status" aria-live="polite"></p>
        </section>
      </section>
      <figure class="preview ${page.imageClass}">
        <figcaption>${escape(page.label)}<span>Tap to open the full image</span></figcaption>
        <a class="preview-image" href="${page.image}" target="_blank" rel="noopener" aria-label="Open ${escape(page.label.toLowerCase())} in full size"><img src="${page.image}" width="${page.imageWidth}" height="${page.imageHeight}" alt="${escape(page.imageAlt)}" fetchpriority="high" decoding="async"></a>
      </figure>
    </div>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div><strong>Jamatia Islamic Centre</strong><p>${escape(SITE.address.full)}</p><a href="tel:+441217786612">${escape(SITE.phone)}</a></div>
      <nav aria-label="Related links">${page.related}<a href="https://jicmasjid.org/prayer-times/monthly">Monthly timetable on the JIC website</a><a href="${SITE_ORIGIN}/contact">Contact the centre</a></nav>
    </div>
  </footer>
</body>
</html>
`;
}

await mkdir(path.join(output, directory), { recursive: true });
if (output !== path.join(root, 'public')) {
  const files = [
    'downloads/timetable-share.css',
    'downloads/timetable-share.js',
    'brand/jic-horizontal-light.svg',
    'favicon.svg',
    ...Object.values(assets).map((file) => file.slice(1)),
    ...pages.map((page) => page.preview.slice(1)),
  ];
  for (const file of files) {
    await mkdir(path.dirname(path.join(output, file)), { recursive: true });
    await copyFile(path.join(root, 'public', file), path.join(output, file));
  }
}
for (const page of pages) {
  const filename = path.join(output, page.path, 'index.html');
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, render(page));
}
// A dedicated static fallback needs a useful root URL as well as the canonical
// download routes. This root page points crawlers and visitors to the timetable.
if (output !== path.join(root, 'public')) {
  await writeFile(path.join(output, 'index.html'), render(pages[0]));
  await writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
}
console.log(JSON.stringify({ output, pages: pages.map((page) => `${origin}${page.path}`) }, null, 2));
