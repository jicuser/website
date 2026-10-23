import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { centreStructuredData, pageMetadata } from '@/lib/pageMetadata';

export default function PageMetadata(overrides) {
  const { pathname } = useLocation();
  const meta = pageMetadata(pathname, overrides);
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta
        name="robots"
        content={meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
      />
      <link rel="canonical" href={meta.url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Jamatia Islamic Centre" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:image" content={meta.image} />
      <meta property="og:image:alt" content={meta.imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={meta.image} />
      {meta.path === '/' && (
        <script type="application/ld+json">
          {JSON.stringify(centreStructuredData).replace(/</g, '\\u003c')}
        </script>
      )}
    </Helmet>
  );
}
