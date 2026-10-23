import React from 'react';
import PageMetadata from './PageMetadata';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';

export default function PageTitle() {
  const { pathname, search } = useLocation();
  const { getContent } = useContent();
  const hidden =
    !isPageVisible(getContent, pathname) || new URLSearchParams(search).get('preview') === '1';
  return <PageMetadata noindex={hidden ? true : undefined} />;
}
