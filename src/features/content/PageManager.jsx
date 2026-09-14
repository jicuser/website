import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { checked } from '@/components/workspace/shared';
import { pageDraft, pageUrl, formAdminUrl } from '@/lib/pageContent';
import ContentPageEditor from './ContentPageEditor';
import useWorkflowData from './useWorkflowData';

export default function PageManager({ poster = null }) {
  const [editor, setEditor] = useState(null),
    [error, setError] = useState('');
  const load = useCallback(() => {
    let query = supabase
      .from('content_pages')
      .select('id,slug,title,placement,published,registration,form_id,source_poster_id')
      .order('title')
      .limit(200);
    if (poster) query = query.eq('source_poster_id', poster.id);
    return checked(query);
  }, [poster?.id]);
  const state = useWorkflowData(load);
  const open = async (page) => {
    try {
      setError('');
      const full = await checked(
        supabase.from('content_pages').select('*').eq('id', page.id).single(),
      );
      setEditor(full);
    } catch {
      setError('This page could not be opened. Please retry.');
    }
  };
  return (
    <section className="admin-panel content-workflow">
      <h3>{poster ? 'Linked page & registration' : 'Detail pages & registration'}</h3>
      <p>
        {poster
          ? 'Manage the page and registration linked to this poster. Responses and actions stay attached to the same form.'
          : 'Create a page, choose its section, and publish or hide it without deleting its information.'}
      </p>
      {state.error && <p role="alert">{state.error}</p>}
      {error && <p role="alert">{error}</p>}
      {!state.data && state.loading ? (
        <p role="status">Loading linked pages…</p>
      ) : (
        <>
          {(state.data || []).map((page) => (
            <div key={page.id} className="content-linked-page">
              <strong>{page.title}</strong>
              <span>
                {page.published ? 'Page live' : 'Page hidden'} · {page.placement}
              </span>
              <div className="admin-actions">
                <button className="admin-button" onClick={() => open(page)}>
                  Page settings
                </button>
                {page.published && (
                  <Link
                    className="admin-button"
                    to={pageUrl(page)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View page
                  </Link>
                )}
                {page.form_id && (
                  <>
                    <Link className="admin-button" to={formAdminUrl(page.form_id)}>
                      Form & people
                    </Link>
                    <Link className="admin-button" to={formAdminUrl(page.form_id, 'responses')}>
                      Responses
                    </Link>
                    <Link className="admin-button" to={formAdminUrl(page.form_id, 'actions')}>
                      Actions
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!poster || !state.data?.length) && (
            <button className="admin-button" onClick={() => setEditor(pageDraft(poster))}>
              {poster ? 'Create a page for this poster' : 'Create page'}
            </button>
          )}
        </>
      )}
      {editor && (
        <ContentPageEditor
          key={editor.id || 'new'}
          initial={editor}
          onClose={() => setEditor(null)}
          onSaved={() => state.refresh()}
        />
      )}
    </section>
  );
}
