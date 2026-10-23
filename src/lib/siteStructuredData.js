import { SITE } from '../content/site.js';
import { pageName } from '../content/pageDirectory.js';
import { PREVIEW_IMAGE, SITE_ORIGIN } from './pageMetadata.js';

export const centreStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Mosque',
  '@id': `${SITE_ORIGIN}/#masjid`,
  name: SITE.name,
  alternateName: ['JIC', 'JIC Masjid', 'Woodlands Road Masjid', 'Woodlands Road Mosque'],
  url: SITE_ORIGIN,
  image: PREVIEW_IMAGE,
  telephone: '+441217786612',
  email: SITE.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.line1,
    addressLocality: 'Birmingham',
    addressRegion: 'West Midlands',
    postalCode: 'B11 4ER',
    addressCountry: 'GB',
  },
  sameAs: Object.values(SITE.socials),
};

/** Describe the real centre and page; Google has no supported prayer-panel markup. */
export function pageStructuredData(meta) {
  if (meta.noindex) return [];
  if (meta.path === '/' || meta.path === '/contact') return [centreStructuredData];
  if (!['/prayer-times', '/prayer-times/monthly', '/prayer-times/jummah'].includes(meta.path))
    return [];
  return [
    centreStructuredData,
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${meta.url}#webpage`,
      url: meta.url,
      name: meta.title,
      description: meta.description,
      inLanguage: 'en-GB',
      about: { '@id': centreStructuredData['@id'] },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Prayer Times',
            item: `${SITE_ORIGIN}/prayer-times`,
          },
          ...(meta.path !== '/prayer-times'
            ? [{ '@type': 'ListItem', position: 3, name: pageName(meta.path), item: meta.url }]
            : []),
        ],
      },
    },
  ];
}
