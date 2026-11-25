import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { safeWebUrl } from '@/lib/video';

function fullSizeImageUrl(src) {
  if (typeof src !== 'string') return undefined;
  if (/^\/(?!\/)/.test(src) && !/[\s\\]/.test(src)) return src;
  return safeWebUrl(src) || undefined;
}

export default function ManagedPageSections({ pagePath }) {
  const { pathname } = useLocation();
  const contentPath = pagePath || pathname;
  const [sections, setSections] = useState([]);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (
      window.parent === window ||
      new URLSearchParams(window.location.search).get('preview') !== '1'
    )
      return;
    const refresh = () =>
      setDraft(
        window.__jicPagePreview?.path === contentPath ? window.__jicPagePreview.sections : null,
      );
    refresh();
    window.addEventListener('jic-page-preview', refresh);
    return () => window.removeEventListener('jic-page-preview', refresh);
  }, [contentPath]);

  useEffect(() => {
    let active = true;
    setSections([]);
    const load = () =>
      supabase
        .from('page_sections')
        .select('id,section_key,title,body,background_image_url,image_urls,sort_order,published')
        .eq('page_path', contentPath)
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .then(({ data, error }) => {
          if (active) setSections(error ? [] : data || []);
        });
    load();
    window.addEventListener('focus', load);
    window.addEventListener('jic-content-updated', load);
    return () => {
      active = false;
      window.removeEventListener('focus', load);
      window.removeEventListener('jic-content-updated', load);
    };
  }, [contentPath]);

  const shown = (draft || sections).filter((section) => section.published);
  if (!shown.length) return null;
  return (
    <div className="managed-page-sections">
      {shown.map((section) => {
        const images = Array.isArray(section.image_urls) ? section.image_urls : [];
        const style = section.background_image_url
          ? {
              backgroundImage: `linear-gradient(rgba(7,17,27,.72),rgba(7,17,27,.72)),url("${section.background_image_url}")`,
            }
          : undefined;
        return (
          <section
            key={section.id}
            className={`managed-page-section ${style ? 'has-photo' : ''}`}
            style={style}
          >
            <div className="managed-page-section-inner">
              <div className="managed-page-section-copy">
                {section.title && <h2>{section.title}</h2>}
                {section.body && <p>{section.body}</p>}
              </div>
              {images.length > 0 && (
                <div className="managed-page-section-gallery">
                  {images.map((src, i) => {
                    const fullSizeUrl = fullSizeImageUrl(src);
                    const label = `${section.title || 'JIC'}${images.length > 1 ? ` ${i + 1}` : ''}`;
                    return (
                      <a
                        key={`${section.id}-${i}`}
                        className="managed-page-section-image"
                        href={fullSizeUrl}
                        target={fullSizeUrl ? '_blank' : undefined}
                        rel={fullSizeUrl ? 'noopener noreferrer' : undefined}
                        aria-label={
                          fullSizeUrl ? `Open ${label} full size (opens in a new tab)` : undefined
                        }
                      >
                        <img src={src} alt={label} loading="lazy" decoding="async" />
                        {fullSizeUrl && <span>Open full-size image</span>}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
