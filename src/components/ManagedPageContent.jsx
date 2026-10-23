import React from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import { pageKey } from '@/content/editablePages';
export default function ManagedPageContent({
  fallbackTitle = '',
  fallbackBody = '',
  optional = false,
  headingLevel = 1,
  className = '',
}) {
  const { pathname } = useLocation();
  const { getContent } = useContent();
  let content = {};
  try {
    const parsed = JSON.parse(getContent(pageKey(pathname), '{}'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) content = parsed;
  } catch {}
  if (optional && !content.title && !content.body && !content.image) return null;
  const title = content.title ?? fallbackTitle,
    body = content.body ?? fallbackBody;
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  return (
    <section className={`managed-page-content ${className}`}>
      <div className="managed-page-copy">
        {title && <Heading>{title}</Heading>}
        {body && <p>{body}</p>}
      </div>
      {content.image && /^(https:\/\/|blob:)/i.test(content.image) && (
        <img src={content.image} alt={title || 'Jamatia Islamic Centre'} />
      )}
    </section>
  );
}
