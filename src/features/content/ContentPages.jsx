import React, { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAdminSave } from '@/context/AdminSaveContext';
import { useAuth } from '@/context/AuthContext';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked } from '@/components/workspace/shared';
import { PAGE_PLACEMENTS, pageUrl } from '@/lib/pageContent';
import ContentPageEditor from './ContentPageEditor';
import PageEditor from '@/components/admin/PageEditor';
import '@/styles/content-workflow.css';
import '@/styles/workspace.css';
import '@/styles/custom-forms.css';
import '@/styles/programme-page-manager.css';

export function ContentPageCatalogue() {
  const { can } = useAuth();
  const read = useCallback(
    (signal) =>
      checked(
        supabase.from('site_pages').select('*').order('title').limit(200).abortSignal(signal),
      ),
    [],
  );
  const { data: pages, loading, error, reload } = useAdminRecords(read);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  if (editing)
    return (
      <ContentPageEditor
        key={editing.id || 'new'}
        page={editing.id ? editing : null}
        initialPlacement={editing.placement}
        onClose={() => setEditing(null)}
        onSaved={(page) => {
          setEditing(page);
          reload();
        }}
      />
    );
  const search = query.trim().toLocaleLowerCase();
  const listed = (pages || []).filter((page) => {
    const placement = PAGE_PLACEMENTS.find(([path]) => path === page.placement)?.[1] || '';
    return (
      (section === 'all' || page.placement === section) &&
      (filter === 'all' || (filter === 'live' ? page.published : !page.published)) &&
      (!search || `${page.title} ${page.slug} ${placement}`.toLocaleLowerCase().includes(search))
    );
  });
  function clearFilters() {
    setSection('all');
    setFilter('all');
    setQuery('');
  }
  return (
    <section className="content-pages-manager">
      <div className="admin-heading">
        <div>
          <h2>Programme pages</h2>
          <p>
            Choose a website section, then open a page to edit, move or show/hide it. Forms and
            responses are managed separately.
          </p>
        </div>
        <button
          className="admin-button primary"
          onClick={() => setEditing({ placement: section === 'all' ? '/education' : section })}
        >
          Create page
        </button>
      </div>
      <div className="programme-page-filters">
        <label>
          Website section
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="all">All sections</option>
            {PAGE_PLACEMENTS.map(([path, label]) => (
              <option key={path} value={path}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search pages
          <input
            type="search"
            value={query}
            placeholder="Page title or address"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Visibility
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Visible and hidden</option>
            <option value="live">Visible on website</option>
            <option value="hidden">Hidden from website</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert">
          {error}{' '}
          <button className="admin-button" onClick={reload}>
            Retry pages
          </button>
        </p>
      )}
      {loading && !pages && <p role="status">Loading pages…</p>}
      {!loading && !error && (
        <p className="programme-page-count" role="status">
          {listed.length} {listed.length === 1 ? 'page' : 'pages'} shown
          {section !== 'all' || filter !== 'all' || query ? (
            <button className="admin-button" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </p>
      )}
      <div className="content-form-grid">
        {listed.map((page) => (
          <article className="admin-panel programme-page-card" key={page.id}>
            <span className="content-status">
              {page.published ? 'Visible on website' : 'Hidden from website'}
            </span>
            <h3>{page.title}</h3>
            <p>
              <span>Website section: </span>
              <strong>
                {PAGE_PLACEMENTS.find(([path]) => path === page.placement)?.[1] || page.placement}
              </strong>
            </p>
            <div className="admin-actions">
              <button
                className="admin-button"
                aria-label={`Edit ${page.title}`}
                onClick={() => setEditing(page)}
              >
                Edit page
              </button>
              {page.published && (
                <Link className="admin-button" to={pageUrl(page)} target="_blank" rel="noreferrer">
                  View page
                </Link>
              )}
              {page.form_id && can('forms') && (
                <Link className="admin-button" to={`/admin?section=forms&form=${page.form_id}`}>
                  Form & responses
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      {!loading && !error && !listed.length && (
        <p>
          {pages?.length
            ? 'No pages match these filters. Clear the filters or choose another section.'
            : 'No programme pages yet. Create a page here or from a poster.'}
        </p>
      )}
    </section>
  );
}

export default function ContentPages({ initialPath = '/' }) {
  const { dirty, saving } = useAdminSave();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('view') === 'pages' ? 'pages' : 'site';
  function choose(next) {
    if (saving || tab === next || (dirty && !window.confirm('Discard unsaved page changes?')))
      return;
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set('view', next);
        return updated;
      },
      { replace: true },
    );
  }
  function choosePage(path) {
    if (
      saving ||
      path === initialPath ||
      (dirty && !window.confirm('Discard unsaved changes and open another page?'))
    )
      return;
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set('section', 'content');
        updated.set('view', 'site');
        updated.set('page', path);
        return updated;
      },
      { replace: true },
    );
  }
  return (
    <div>
      <nav className="admin-actions" aria-label="Website content">
        <button
          className="admin-button"
          aria-pressed={tab === 'site'}
          onClick={() => choose('site')}
        >
          Existing pages
        </button>
        <button
          className="admin-button"
          aria-pressed={tab === 'pages'}
          onClick={() => choose('pages')}
        >
          Programme pages
        </button>
        {can('team') && (
          <Link className="admin-button" to="/admin?section=team">
            Team profiles
          </Link>
        )}
      </nav>
      {tab === 'site' ? (
        <PageEditor key={initialPath} initialPath={initialPath} onSelectPage={choosePage} />
      ) : (
        <ContentPageCatalogue />
      )}
    </div>
  );
}
