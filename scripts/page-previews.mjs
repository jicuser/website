import {
  centreStructuredData,
  pageMetadata,
  publicMetadataPaths,
  SITE_ORIGIN,
} from '../src/lib/pageMetadata.js';

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

export function pageHead(path) {
  const meta = pageMetadata(path);
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
    `<link data-react-helmet="true" rel="canonical" href="${escapeHtml(meta.url)}" />`,
    ...Object.entries({
      'og:type': 'website',
      'og:site_name': 'Jamatia Islamic Centre',
      'og:locale': 'en_GB',
      'og:title': meta.title,
      'og:description': meta.description,
      'og:url': meta.url,
      'og:image': meta.image,
      'og:image:alt': meta.imageAlt,
    }).map(([key, value]) => tag('property', key, value)),
    ...Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': meta.title,
      'twitter:description': meta.description,
      'twitter:image': meta.image,
    }).map(([key, value]) => tag('name', key, value)),
    ...(meta.path === '/'
      ? [
          `<script data-react-helmet="true" type="application/ld+json">${JSON.stringify(centreStructuredData).replace(/</g, '\\u003c')}</script>`,
        ]
      : []),
  ].join('\n    ');
}

export function withPageHead(html, path) {
  return html.replace(
    /<!-- jic:metadata:start -->[\s\S]*?<!-- jic:metadata:end -->/,
    `<!-- jic:metadata:start -->\n    ${pageHead(path)}\n    <!-- jic:metadata:end -->`,
  );
}

export function pagePreviews() {
  return {
    name: 'jic-page-previews',
    enforce: 'post',
    transformIndexHtml(html) {
      return withPageHead(html, '/');
    },
    generateBundle(_options, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') this.error('The website entry document is missing.');
      const html = String(entry.source);
      for (const path of [...publicMetadataPaths, '/admin/login', '/portal', '/ramadan/display']) {
        if (path !== '/')
          this.emitFile({
            type: 'asset',
            fileName: `${path.slice(1)}/index.html`,
            source: withPageHead(html, path),
          });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicMetadataPaths.map((path) => `<url><loc>${escapeHtml(pageMetadata(path).url)}</loc></url>`).join('')}</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /portal\nDisallow: /verify/\nDisallow: /tv\nDisallow: /ramadan/display\nDisallow: /search\nDisallow: /fundraise/new\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      });
    },
  };
}
