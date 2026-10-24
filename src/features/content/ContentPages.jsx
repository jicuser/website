import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import CommunityLinksEditor from '@/components/admin/CommunityLinksEditor';
import HeaderContentEditor from '@/components/admin/HeaderContentEditor';
import { useContent } from '@/context/ContentContext';
import { EDITABLE_PAGES } from '@/content/editablePages';
import { buildPageNavigator } from '@/lib/pageNavigator';
import { isPageEnabled, pageSectionKey } from '@/lib/pageVisibility';
import { saveSiteVisibility } from '@/lib/siteVisibility';
import {
  navigationName,
  NAVIGATION_CONTENT_KEY,
  orderedNavigation,
  readNavigationConfiguration,
} from '@/lib/navigationConfiguration';
import '@/styles/page-directory.css';
import React, { useCallback, useState, useEffect } from 'react';
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

export function ContentPageCatalogue({ initialCreate = false }) {
  const { can } = useAuth();
  const read = useCallback(
    (signal) =>
      checked(
        supabase.from('site_pages').select('*').order('title').limit(200).abortSignal(signal),
      ),
    [],
  );
  const { data: pages, loading, error, reload } = useAdminRecords(read);
  const [editing, setEditing] = useState(initialCreate ? { placement: '/education' } : null);
  const [filter, setFilter] = useState('all');
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [visibilityBusy, setVisibilityBusy] = useState(null);
  const [visibilityError, setVisibilityError] = useState('');
  async function togglePublished(page) {
    if (visibilityBusy) return;
    setVisibilityBusy(page.id);
    setVisibilityError('');
    try {
      const saved = await checked(
        supabase.rpc('save_site_page', {
          p_page: {
            ...page,
            published: !page.published,
            expected_updated_at: page.updated_at || null,
          },
        }),
      );
      if (!saved?.id) throw new Error('The visibility change was not saved.');
      reload();
      window.dispatchEvent(new Event('content-workflow-updated'));
    } catch (error) {
      setVisibilityError(error.message || 'Could not update page visibility.');
    } finally {
      setVisibilityBusy(null);
    }
  }
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
      {visibilityError && <p role="alert">{visibilityError}</p>}
      <div className="content-form-grid">
        {listed.map((page) => (
          <article className="admin-panel programme-page-card" key={page.id}>
            <span className="content-status">
              {page.published ? 'Visible on website' : 'Hidden from website'}
            </span>
            <div className="page-directory__row">
              <h3>
                <button className="page-directory__name" onClick={() => setEditing(page)}>
                  {page.title}
                </button>
              </h3>
              <button
                className="page-directory__toggle"
                role="switch"
                aria-label={`Show ${page.title} on website`}
                aria-checked={page.published}
                disabled={Boolean(visibilityBusy)}
                onClick={() => togglePublished(page)}
              >
                {page.published ? 'On' : 'Off'}
              </button>
            </div>
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

export default function ContentPages({ initialPath = '/', registerBack }) {
  const { dirty, saving } = useAdminSave();
  const { getContent, saveContent, refreshContent } = useContent();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('edit');
  const tab = params.get('view');
  const opened = params.has('page');
  const selected = EDITABLE_PAGES.find((page) => page.path === initialPath);
  useEffect(() => {
    if (!opened && tab !== 'pages' && tab !== 'add') return;
    registerBack?.(() => {
      if (saving || (dirty && !window.confirm('Discard unsaved page changes?'))) return;
      setParams({ section: 'content' });
    });
    return () => registerBack?.(null);
  }, [opened, tab, dirty, saving, registerBack, setParams]);
  function navigate(path, view = 'site') {
    if (saving || (dirty && !window.confirm('Discard unsaved page changes?'))) return;
    setMode('edit');
    setParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set('view', view);
      if (path) updated.set('page', path);
      else updated.delete('page');
      return updated;
    });
  }
  async function toggle(page) {
    if (busy) return;
    setBusy(page.path);
    setMessage('');
    try {
      const visible = isPageEnabled(getContent, page.path);
      await saveSiteVisibility(supabase, page, !visible);
      await refreshContent();
      setMessage(`${page.name} is now ${visible ? 'hidden' : 'visible'}.`);
    } catch (error) {
      setMessage(error.message || 'Could not save visibility. Try again.');
    } finally {
      setBusy(null);
    }
  }
  async function movePage(section) {
    if (!selected || busy || saving) return;
    setBusy(selected.path);
    setMessage('');
    try {
      await saveContent(pageSectionKey(selected.path), section);
      setMessage('Page moved. Its website address has stayed the same.');
    } catch (error) {
      setMessage(error.message || 'Could not move this page.');
    } finally {
      setBusy(null);
    }
  }
  if (tab === 'pages' || tab === 'add')
    return (
      <>
        <button className="admin-button" onClick={() => navigate(null)}>
          ← All pages
        </button>
        <ContentPageCatalogue initialCreate={tab === 'add'} />
      </>
    );
  if (opened && selected)
    return (
      <section className="page-workspace">
        <div className="admin-heading">
          <button className="admin-button" onClick={() => navigate(null)}>
            ← All pages
          </button>
          <h2>{navigationName(getContent, selected.path, selected.name)}</h2>
        </div>
        <nav className="admin-actions" aria-label="Page actions">
          <button
            className="admin-button"
            aria-pressed={mode === 'view'}
            onClick={() => {
              if (!dirty || window.confirm('Discard unsaved page changes?')) setMode('view');
            }}
            disabled={saving}
          >
            View saved page
          </button>
          <button
            className="admin-button"
            aria-pressed={mode === 'edit'}
            onClick={() => setMode('edit')}
          >
            Edit & preview
          </button>
          <a className="admin-button" href={selected.path} target="_blank" rel="noreferrer">
            Open website ↗
          </a>
        </nav>
        {!PUBLIC_MENU_GROUPS.some((group) => group.path === selected.path) && (
          <label>
            Menu section
            <select
              aria-label="Move page to section"
              disabled={Boolean(busy) || saving || dirty}
              value={getContent(pageSectionKey(selected.path), '')}
              onChange={(event) => movePage(event.target.value)}
            >
              <option value="">Original section</option>
              {PUBLIC_MENU_GROUPS.filter((group) => group.children?.length).map((group) => (
                <option key={group.path} value={group.path}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {message && <p role="status">{message}</p>}
        {mode === 'edit' ? (
          <PageEditor key={initialPath} initialPath={initialPath} workspace />
        ) : (
          <iframe
            className="page-workspace__preview"
            title={`${selected.name} website preview`}
            src={`${selected.path}?preview=1`}
          />
        )}
      </section>
    );
  const menuSettings = readNavigationConfiguration(getContent(NAVIGATION_CONTENT_KEY, '{}'));
  const sections = orderedNavigation(buildPageNavigator(EDITABLE_PAGES), menuSettings.order).map(
    (section) => ({
      ...section,
      name: menuSettings.labels[section.path] || section.name,
      pages: orderedNavigation(section.pages, menuSettings.children[section.path]).map((page) => ({
        ...page,
        name: menuSettings.labels[page.path] || page.name,
        label: menuSettings.labels[page.path] || page.label,
      })),
    }),
  );
  for (const section of sections) {
    for (const page of [...section.pages]) {
      const destination = sections.find(
        (candidate) => candidate.path === getContent(pageSectionKey(page.path), ''),
      );
      if (
        destination &&
        destination !== section &&
        !PUBLIC_MENU_GROUPS.some((group) => group.path === page.path)
      ) {
        section.pages = section.pages.filter((candidate) => candidate.path !== page.path);
        destination.pages.push(page);
      }
    }
  }
  const matching = query.trim().toLowerCase();
  return (
    <section className="page-directory">
      <div className="admin-heading">
        <h2>Website pages</h2>
        <button className="admin-button primary" onClick={() => navigate(null, 'add')}>
          ＋ Add page
        </button>
      </div>
      <label className="page-directory__search">
        Find a page
        <input
          type="search"
          placeholder="Page name or section…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="admin-actions">
        <Link className="admin-button" to="/admin?section=visibility">
          Show or hide pages
        </Link>
        <Link className="admin-button" to="/admin?section=menus">
          Menu names & order
        </Link>
        <button className="admin-button" onClick={() => navigate(null, 'pages')}>
          Manage added pages
        </button>
        <Link className="admin-button" to="/admin/home-tiles">
          Home feature
        </Link>
      </div>
      <details className="admin-panel">
        <summary>Website settings</summary>
        <HeaderContentEditor />
        <CommunityLinksEditor />
      </details>
      {message && <p role="status">{message}</p>}
      <p>Open a page to view or edit it. Switch off to hide it without deleting its content.</p>
      {sections.map((section) => {
        const pages = section.pages.filter(
          (page) => !matching || `${page.name} ${section.name}`.toLowerCase().includes(matching),
        );
        if (!pages.length) return null;
        return (
          <details
            className="admin-panel page-directory__section"
            key={section.name}
            open={matching ? true : undefined}
          >
            <summary>
              {section.name}
              <small>{pages.length} pages</small>
            </summary>
            {pages.map((page) => (
              <div className="page-directory__row" key={page.path}>
                <button className="page-directory__name" onClick={() => navigate(page.path)}>
                  {page.label || page.name}
                  <span aria-hidden="true">›</span>
                </button>
                <button
                  type="button"
                  className="page-directory__toggle"
                  role="switch"
                  aria-checked={isPageEnabled(getContent, page.path)}
                  aria-label={`Show ${page.name} on website`}
                  disabled={Boolean(busy) || ['/', '/privacy'].includes(page.path)}
                  onClick={() => toggle(page)}
                >
                  {isPageEnabled(getContent, page.path) ? 'On' : 'Off'}
                </button>
              </div>
            ))}
          </details>
        );
      })}
    </section>
  );
}
