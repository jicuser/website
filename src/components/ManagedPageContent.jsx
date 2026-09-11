import React from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import { pageKey } from '@/content/editablePages';
export default function ManagedPageContent({
  fallbackTitle = '',
  fallbackBody = '',
  optional = false,
}) {
  const { pathname } = useLocation();
  const { getContent } = useContent();
  let content = {};
  try {
    content = JSON.parse(getContent(pageKey(pathname), '{}'));
  } catch {}
  if (optional && !content.title && !content.body && !content.image) return null;
  const title = content.title ?? fallbackTitle,
    body = content.body ?? fallbackBody;
  return (
    <section className="managed-page-content">
      <div className="managed-page-copy">
        {title && <h1>{title}</h1>}
        {body && <p>{body}</p>}
      </div>
      {content.image && /^https:\/\//i.test(content.image) && (
        <img src={content.image} alt={title || 'Jamatia Islamic Centre'} />
      )}
    </section>
  );
}
