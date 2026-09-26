import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { checked } from '@/components/workspace/shared';
import useAdminRecords from '@/hooks/useAdminRecords';
import { useAuth } from '@/context/AuthContext';
import { useAdminSave } from '@/context/AdminSaveContext';
import ContentPageEditor from './ContentPageEditor';
import { pageUrl } from '@/lib/pageContent';

export default function PosterWorkflow({ poster, onEditPoster }) {
  const { can } = useAuth();
  const { dirty } = useAdminSave();
  const [tab, setTab] = useState('overview');
  const read = useCallback(
    (signal) =>
      checked(
        supabase
          .from('site_pages')
          .select('*')
          .eq('source_poster_id', poster.id)
          .limit(1)
          .abortSignal(signal),
      ),
    [poster.id],
  );
  const { data, loading, error, reload } = useAdminRecords(read);
  const page = data?.[0];
  const choose = (next) => {
    if (
      tab === next ||
      (dirty && !window.confirm('Discard unsaved changes before changing this view?'))
    )
      return;
    setTab(next);
  };
  return (
    <section className="poster-workflow">
      <nav className="poster-workflow-tabs" aria-label="Poster management">
        <button className="admin-button" aria-pressed={tab === 'overview'} onClick={() => choose('overview')}>
          Overview
        </button>
        <button className="admin-button" onClick={onEditPoster}>Edit poster</button>
        <button className="admin-button" aria-pressed={tab === 'page'} onClick={() => choose('page')}>
          {page ? 'Page & registration' : 'Add page / registration'}
        </button>
      </nav>
      {error && (
        <p role="alert">
          {error}{' '}
          <button className="admin-button" onClick={reload}>
            Retry linked page
          </button>
        </p>
      )}
      {loading && !data && <p role="status">Loading linked page…</p>}
      {!error && data && tab === 'page' && (
        <ContentPageEditor
          key={page?.id || poster.id}
          page={page}
          poster={poster}
          onSaved={reload}
        />
      )}
      {tab === 'overview' && (
        <>
          <div className="poster-overview-card">
            {poster.image ? (
              <img className="poster-overview-image" src={poster.image} alt={poster.alt || poster.title} />
            ) : (
              <div className="poster-overview-image poster-overview-placeholder">No poster image</div>
            )}
            <div>
              <h3>{poster.title}</h3>
              {poster.subtitle && <p><strong>{poster.subtitle}</strong></p>}
              {poster.schedule && <p>{poster.schedule}</p>}
              {poster.detail && <p>{poster.detail}</p>}
            </div>
          </div>
          {page ? (
            <>
              <p>
                Website page: {page.published ? 'Visible' : 'Hidden'} · {page.title}
              </p>
              {page.published && (
                <Link className="admin-button" to={pageUrl(page)} target="_blank" rel="noreferrer">
                  View page
                </Link>
              )}
              <p>
                {page.form_id
                  ? can('forms')
                    ? 'Registration form linked. Open Forms to manage responses and actions.'
                    : 'A registration form is linked. Response access is limited to authorised staff.'
                  : 'No form linked. This poster can remain an announcement without registration.'}
              </p>
            </>
          ) : (
            !loading &&
            !error && (
              <p>
                No detail page yet. Choose Page & registration to create one; a form is optional.
              </p>
            )
          )}
        </>
      )}

    </section>
  );
}
