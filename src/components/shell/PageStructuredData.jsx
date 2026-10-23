import React from 'react';
import { Helmet } from 'react-helmet';
import { pageStructuredData } from '@/lib/siteStructuredData';

export default function PageStructuredData({ meta }) {
  return (
    <Helmet>
      {pageStructuredData(meta).map((data) => (
        <script key={data['@id']} type="application/ld+json">
          {JSON.stringify(data).replace(/</g, '\\u003c')}
        </script>
      ))}
    </Helmet>
  );
}
