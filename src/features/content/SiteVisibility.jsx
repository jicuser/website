import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useContent } from '@/context/ContentContext';
import { PUBLIC_PAGES } from '@/content/pageDirectory';
import { isPageEnabled } from '@/lib/pageVisibility';
import { pageUrl } from '@/lib/pageContent';
import { collectPages } from '@/lib/formDownloads';
import { saveSiteVisibility } from '@/lib/siteVisibility';
import SimpleToggle from '@/components/admin/SimpleToggle';
import '@/styles/booking-calendars.css';

export default function SiteVisibility() {
  const { getContent, refreshContent } = useContent();
  const [extra, setExtra] = useState([]),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    collectPages(async (offset, size) => {
      const result = await supabase
        .from('site_pages')
        .select('id,title,slug,placement,published')
        .order('title')
        .order('id')
        .range(offset, offset + size - 1)
        .abortSignal(controller.signal);
      if (result.error) throw result.error;
      return result.data || [];
    })
      .then((rows) => {
        if (!controller.signal.aborted) setExtra(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Added pages could not be loaded. Refresh to try again.');
      });
    return () => controller.abort();
  }, []);
  const rows = [
    ...PUBLIC_PAGES,
    ...extra.map((page) => ({
      ...page,
      name: page.title,
      path: pageUrl(page),
      group: 'Added pages',
    })),
  ].map((page) => ({
    ...page,
    visible: page.id ? page.published : isPageEnabled(getContent, page.path),
  }));
  const shown = rows.filter(
    (page) =>
      (filter === 'all' || (filter === 'on' ? page.visible : !page.visible)) &&
      (!query.trim() ||
        `${page.name} ${page.group} ${page.path}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  async function toggle(page, visible) {
    if (busy) return;
    setBusy(page.path);
    setError('');
    setMessage('');
    try {
      await saveSiteVisibility(supabase, page, visible);
      if (page.id)
        setExtra((current) =>
          current.map((item) => (item.id === page.id ? { ...item, published: visible } : item)),
        );
      await refreshContent();
      window.dispatchEvent(new Event('jic-content-updated'));
      setMessage(`${page.name} is ${visible ? 'on' : 'off'}.`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="booking-workspace">
      <header>
        <h2>Show or hide pages</h2>
        <p>Switch a page off without deleting it.</p>
        <Link className="booking-button" to="/admin?section=content">
          Edit website pages
        </Link>
      </header>
      <div className="site-visibility-filters">
        <label className="booking-field">
          Find a page
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Page name…"
          />
        </label>
        <label className="booking-field">
          Show
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All pages</option>
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {[...new Set(shown.map((page) => page.group))].map((group) => (
        <section className="booking-panel site-visibility-section" key={group}>
          <h3>{group}</h3>
          {shown
            .filter((page) => page.group === group)
            .map((page) => (
              <SimpleToggle
                key={page.path}
                label={page.name}
                detail={['/', '/privacy'].includes(page.path) ? 'Always on' : undefined}
                checked={page.visible}
                disabled={Boolean(busy) || ['/', '/privacy'].includes(page.path)}
                onChange={(visible) => toggle(page, visible)}
              />
            ))}
        </section>
      ))}
      {!shown.length && <p>No pages match your search.</p>}
    </section>
  );
}
