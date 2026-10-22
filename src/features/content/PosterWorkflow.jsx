import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { checked } from '@/components/workspace/shared';
import useAdminRecords from '@/hooks/useAdminRecords';
import { useAuth } from '@/context/AuthContext';
import { useAdminSave } from '@/context/AdminSaveContext';
import ContentPageEditor from './ContentPageEditor';
import { pageUrl } from '@/lib/pageContent';
import { pageName } from '@/content/pageDirectory';
import PosterLocations from './PosterLocations';

export default function PosterWorkflow({
  poster,
  onEditPoster,
  onChangeLocations,
  pages,
  disabled,
  posterDirty,
}) {
  const { can } = useAuth();
  const { dirty, saving } = useAdminSave();
  const [tab, setTab] = useState('overview');
  const [pageBusy, setPageBusy] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
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
  const setPageVisible = async (visible) => {
    if (!page || pageBusy) return;
    if (dirty) {
      window.alert(
        'Save or discard the current page/form changes before changing page visibility.',
      );
      return;
    }
    if (
      !visible &&
      !window.confirm('Hide this dedicated page? Its linked form and responses are kept.')
    )
      return;
    setPageBusy(true);
    setPageMessage('');
    try {
      await checked(
        supabase.rpc('save_site_page', {
          p_page: {
            ...page,
            published: visible,
            expected_updated_at: page.updated_at || null,
          },
        }),
      );
      await reload();
      setPageMessage(visible ? 'Dedicated page is now visible.' : 'Dedicated page is hidden.');
    } catch (failure) {
      setPageMessage(failure.message || 'Page visibility could not be changed.');
    } finally {
      setPageBusy(false);
    }
  };
  const choose = (next) => {
    if (posterDirty && tab === 'overview' && next === 'page') {
      window.alert('Publish your poster changes before opening the dedicated page editor.');
      return;
    }
    if (
      saving ||
      pageBusy ||
      tab === next ||
      (dirty && !window.confirm('Discard unsaved changes before changing this view?'))
    )
      return;
    setTab(next);
  };
  const guardFormNavigation = (event) => {
    if (
      saving ||
      pageBusy ||
      (dirty && !window.confirm('Leave without publishing the current changes?'))
    )
      event.preventDefault();
  };
  return (
    <section className="poster-workflow">
      <nav className="poster-workflow-tabs" aria-label="Poster management">
        <button
          className="admin-button"
          aria-pressed={tab === 'overview'}
          onClick={() => choose('overview')}
        >
          Overview
        </button>
        <button className="admin-button" onClick={onEditPoster}>
          Edit poster
        </button>
        <button
          className="admin-button"
          aria-pressed={tab === 'page'}
          onClick={() => choose('page')}
        >
          {page ? 'Page' : 'Add page'}
        </button>
        {page?.form_id && can('forms') && (
          <Link
            className="admin-button"
            to={`/admin?section=forms&form=${page.form_id}`}
            onClick={guardFormNavigation}
          >
            Form & responses
          </Link>
        )}
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
          <PosterLocations
            poster={poster}
            pages={pages}
            onChange={onChangeLocations}
            disabled={disabled || saving || pageBusy}
          />
          {page?.published && (
            <p className="poster-linked-placement">
              The dedicated programme page remains available when you remove a poster location. Its
              page listing is managed separately in Page → Website section.
            </p>
          )}
          <div className="poster-overview-card">
            {poster.image ? (
              <img
                className="poster-overview-image"
                src={poster.image}
                alt={poster.alt || poster.title}
              />
            ) : (
              <div className="poster-overview-image poster-overview-placeholder">
                No poster image
              </div>
            )}
            <div>
              <h3>{poster.title}</h3>
              {poster.subtitle && (
                <p>
                  <strong>{poster.subtitle}</strong>
                </p>
              )}
              {poster.schedule && <p>{poster.schedule}</p>}
              {poster.detail && <p>{poster.detail}</p>}
            </div>
          </div>

          <div className="poster-setup-grid">
            <section className="admin-panel">
              <strong>Centre screens</strong>
              <p>
                Website locations do not change screen playlists. Choose this poster for each screen
                in Screens & layouts.
              </p>
              {can('tv') && (
                <Link className="admin-button" to="/admin?section=tv" onClick={guardFormNavigation}>
                  Open screen settings
                </Link>
              )}
            </section>

            <section className="admin-panel">
              <strong>Dedicated page</strong>
              {page ? (
                <>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={Boolean(page.published)}
                      disabled={pageBusy}
                      onChange={(event) => setPageVisible(event.target.checked)}
                    />
                    {page.published ? 'Page visible on website' : 'Page hidden'}
                  </label>
                  <p>Listed on: {pageName(page.placement) || 'Website'}</p>
                </>
              ) : (
                <p>Off · this poster has no dedicated page.</p>
              )}
              <button className="admin-button" onClick={() => choose('page')}>
                {page ? 'Edit page & placement' : 'Add dedicated page'}
              </button>
              {page?.published && (
                <Link className="admin-button" to={pageUrl(page)} target="_blank" rel="noreferrer">
                  View page
                </Link>
              )}
              {pageMessage && <small role="status">{pageMessage}</small>}
            </section>

            <section className="admin-panel">
              <strong>Registration / form</strong>
              <p>
                {page?.form_id
                  ? page.registration === 'none'
                    ? 'Form linked · public registration is off. Responses are kept.'
                    : 'Form linked · public registration is on. Responses and actions are managed in Forms.'
                  : 'Off · no registration form linked.'}
              </p>
              {page?.form_id && can('forms') ? (
                <Link
                  className="admin-button"
                  to={`/admin?section=forms&form=${page.form_id}`}
                  onClick={guardFormNavigation}
                >
                  Open form & responses
                </Link>
              ) : (
                <button className="admin-button" onClick={() => choose('page')}>
                  {page ? 'Add registration form' : 'Add page / form'}
                </button>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
