import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { pageName } from '@/content/pageDirectory';
import { SITE } from '@/content/site';

export default function PageTitle() {
  const { pathname } = useLocation();
  const title = pageName(pathname);
  return (
    <Helmet>
      <title>{title && pathname !== '/' ? `${title} | ${SITE.name}` : SITE.name}</title>
    </Helmet>
  );
}
