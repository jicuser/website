import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canonicalPagePath } from '@/content/pageAliases';

export default function CanonicalPageRedirect() {
  const { pathname, search, hash, state } = useLocation();
  return (
    <Navigate to={{ pathname: canonicalPagePath(pathname), search, hash }} state={state} replace />
  );
}
