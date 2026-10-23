import {
  pageMetadata,
  PRAYER_LOCATION,
  publicMetadataPaths,
  SITE_ORIGIN,
} from '../src/lib/pageMetadata.js';
import { loadPublicPageMetadata } from './public-page-metadata.mjs';
import { pageStructuredData } from '../src/lib/siteStructuredData.js';

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

export function pageHead(path, overrides = {}) {
  const meta = pageMetadata(path, overrides);
  const canonical = !overrides.omitCanonical;
  const tag = (attribute, key, value) =>
    `<meta data-react-helmet="true" ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    tag('name', 'description', meta.description),
    tag(
      'name',
      'robots',
      meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    ),
    ...(canonical
      ? [`<link data-react-helmet="true" rel="canonical" href="${escapeHtml(meta.url)}" />`]
      : []),
    ...Object.entries({
      'og:type': 'website',
      'og:site_name': 'Jamatia Islamic Centre',
      'og:locale': 'en_GB',
      'og:title': meta.title,
      'og:description': meta.description,
      ...(canonical ? { 'og:url': meta.url } : {}),
      'og:image': meta.image,
      'og:image:alt': meta.imageAlt,
    }).map(([key, value]) => tag('property', key, value)),
    ...Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': meta.title,
      'twitter:description': meta.description,
      'twitter:image': meta.image,
    }).map(([key, value]) => tag('name', key, value)),
    ...(canonical && !meta.noindex
      ? pageStructuredData(meta).map(
          (data) =>
            `<script data-react-helmet="true" type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
        )
      : []),
  ].join('\n    ');
}

export function withPageHead(html, path, overrides = {}) {
  const document = html.replace(
    /<!-- jic:metadata:start -->[\s\S]*?<!-- jic:metadata:end -->/,
    () =>
      `<!-- jic:metadata:start -->\n    ${pageHead(path, overrides)}\n    <!-- jic:metadata:end -->`,
  );
  const heading = {
    '/prayer-times': "Today's Prayer Times",
    '/prayer-times/monthly': 'Monthly Timetable',
    '/prayer-times/jummah': 'Jummah Times',
  }[path];
  if (!heading) return document;
  // The same introduction appears in the React page. No stale prayer times are
  // embedded here: the current timetable still comes from the published API.
  return document.replace(
    '<div id="root"></div>',
    () =>
      `<div id="root"><main class="mx-auto max-w-4xl px-4 py-6"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(PRAYER_LOCATION)}</p><nav aria-label="Prayer timetable"><a href="/prayer-times">Today’s times</a> · <a href="/prayer-times/monthly">Monthly timetable</a> · <a href="/prayer-times/jummah">Friday Jummah</a></nav><p>Loading the published timetable…</p><noscript>Enable JavaScript to view the current published times, or contact the centre on ${escapeHtml('+44 121 778 6612')}.</noscript></main></div>`,
  );
}

export function pagePreviews({ env = process.env, fetchImpl, timeoutMs } = {}) {
  return {
    name: 'jic-page-previews',
    enforce: 'post',
    transformIndexHtml(html) {
      return withPageHead(html, '/');
    },
    async generateBundle(_options, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') this.error('The website entry document is missing.');
      const html = String(entry.source);
      const { source, records } = await loadPublicPageMetadata({
        env,
        fetchImpl,
        timeoutMs,
        warn: (message) => this.warn(message),
      });
      for (const path of [...publicMetadataPaths, '/admin/login', '/portal', '/ramadan/display']) {
        if (path !== '/')
          this.emitFile({
            type: 'asset',
            fileName: `${path.slice(1)}/index.html`,
            source: withPageHead(html, path),
          });
      }
      for (const { path, ...overrides } of records)
        this.emitFile({
          type: 'asset',
          fileName: `${path.slice(1)}/index.html`,
          source: withPageHead(html, path, overrides),
        });
      this.emitFile({
        type: 'asset',
        fileName: 'metadata-fallback/index.html',
        source: withPageHead(html, '/', { noindex: true, omitCanonical: true }),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'page-metadata.json',
        source: JSON.stringify(
          {
            schemaVersion: 1,
            source,
            pages: records.map(({ path, ...overrides }) => pageMetadata(path, overrides)),
          },
          null,
          2,
        ),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...publicMetadataPaths, ...records.map(({ path }) => path)].map((path) => `<url><loc>${escapeHtml(pageMetadata(path).url)}</loc></url>`).join('')}</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /portal\nDisallow: /verify/\nDisallow: /tv\nDisallow: /ramadan/display\nDisallow: /search\nDisallow: /fundraise/new\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      });
    },
  };
}
