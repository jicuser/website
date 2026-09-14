import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAdminSave } from '@/context/AdminSaveContext';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked } from '@/components/workspace/shared';
import { PAGE_PLACEMENTS, pageUrl } from '@/lib/pageContent';
import ContentPageEditor from './ContentPageEditor';
import PageEditor from '@/components/admin/PageEditor';
import '@/styles/content-workflow.css';
import '@/styles/workspace.css';
import '@/styles/custom-forms.css';

export function ContentPageCatalogue() {
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
  if (editing)
    return (
      <ContentPageEditor
        key={editing.id || 'new'}
        page={editing.id ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={(page) => {
          setEditing(page);
          reload();
        }}
      />
    );
  const listed = (pages || []).filter(
    (page) => filter === 'all' || (filter === 'live' ? page.published : !page.published),
  );
  return (
    <section className="content-pages-manager">
      <div className="admin-heading">
        <div>
          <h2>Pages & programmes</h2>
          <p>
            Choose where a page appears and link its registration form. Hidden pages retain their
            responses and actions.
          </p>
        </div>
        <button className="admin-button primary" onClick={() => setEditing({})}>
          Create page
        </button>
      </div>
      <label>
        Show pages
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All pages</option>
          <option value="live">Visible on website</option>
          <option value="hidden">Draft / hidden</option>
        </select>
      </label>
      {error && (
        <p role="alert">
          {error}{' '}
          <button className="admin-button" onClick={reload}>
            Retry pages
          </button>
        </p>
      )}
      {loading && !pages && <p role="status">Loading pages…</p>}
      <div className="content-form-grid">
        {listed.map((page) => (
          <article className="admin-panel" key={page.id}>
            <span className="content-status">{page.published ? 'Page live' : 'Page hidden'}</span>
            <h3>{page.title}</h3>
            <p>
              {PAGE_PLACEMENTS.find(([path]) => path === page.placement)?.[1] || page.placement}
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
              {page.form_id && (
                <Link className="admin-button" to={`/admin?section=forms&form=${page.form_id}`}>
                  Form & responses
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      {!loading && !error && !listed.length && (
        <p>No pages in this view. Create one here or from a poster.</p>
      )}
    </section>
  );
}

export default function ContentPages({ initialPath = '/' }) {
  const { dirty } = useAdminSave();
  const [tab, setTab] = useState('site');
  function choose(next) {
    if (tab === next || (dirty && !window.confirm('Discard unsaved page changes?'))) return;
    setTab(next);
  }
  return (
    <div>
      <nav className="admin-actions" aria-label="Website content">
        <button
          className="admin-button"
          aria-pressed={tab === 'site'}
          onClick={() => choose('site')}
        >
          Site text & pictures
        </button>
        <button
          className="admin-button"
          aria-pressed={tab === 'pages'}
          onClick={() => choose('pages')}
        >
          Pages & programmes
        </button>
      </nav>
      {tab === 'site' ? <PageEditor initialPath={initialPath} /> : <ContentPageCatalogue />}
    </div>
  );
}
