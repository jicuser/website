import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, Save } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import { configuredNavigation } from '@/lib/pageVisibility';
import { compactMenuNavigation } from '@/lib/publicNavigation';
import { NAVIGATION_CONTENT_KEY, readNavigationConfiguration } from '@/lib/navigationConfiguration';
import { supabase } from '@/lib/supabaseClient';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked } from '@/components/workspace/shared';
import '@/styles/menu-editor.css';

export default function MenuEditor() {
  const { getContent, saveContent } = useContent();
  const raw = getContent(NAVIGATION_CONTENT_KEY, '{}');
  const [draft, setDraft] = useState(() => readNavigationConfiguration(raw));
  const [baseline, setBaseline] = useState(raw);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const read = useCallback(
    (signal) => checked(supabase.rpc('list_site_pages').abortSignal(signal)),
    [],
  );
  const { data: pages, error: pagesError } = useAdminRecords(read);
  const dirty = JSON.stringify(draft) !== JSON.stringify(readNavigationConfiguration(baseline));
  useEffect(() => {
    if (dirty) return;
    setDraft(readNavigationConfiguration(raw));
    setBaseline(raw);
  }, [raw, dirty]);
  const getDraftContent = (key, fallback) =>
    key === NAVIGATION_CONTENT_KEY ? JSON.stringify(draft) : getContent(key, fallback);
  const groups = compactMenuNavigation(
    configuredNavigation(PUBLIC_MENU_GROUPS, getDraftContent, pages || []),
  );
  const changeLabel = (path, name) => {
    setDraft((current) => ({ ...current, labels: { ...current.labels, [path]: name } }));
    setMessage('');
  };
  const move = (items, path, offset, parent) => {
    const paths = items.map((item) => item.path);
    const index = paths.indexOf(path);
    const target = index + offset;
    if (target < 0 || target >= paths.length) return;
    [paths[index], paths[target]] = [paths[target], paths[index]];
    setDraft((current) =>
      parent
        ? { ...current, children: { ...current.children, [parent]: paths } }
        : { ...current, order: paths },
    );
    setMessage('');
  };
  const save = useCallback(async () => {
    if (!dirty || busy) return;
    if (raw !== baseline) {
      setError('The menu was changed elsewhere. Reload this page before saving.');
      throw new Error('The menu was changed elsewhere. Reload before saving.');
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const cleaned = readNavigationConfiguration(draft);
      const value = JSON.stringify(cleaned);
      await saveContent(NAVIGATION_CONTENT_KEY, value, 'json');
      setDraft(cleaned);
      setBaseline(value);
      setMessage('Menu names and order saved.');
    } catch (problem) {
      setError(problem.message || 'Could not save the menu.');
      throw problem;
    } finally {
      setBusy(false);
    }
  }, [draft, dirty, busy, raw, baseline, saveContent]);
  useRegisterAdminSave(save, dirty, 'Save menu', busy);
  const arrows = (items, item, index, parent) => (
    <span className="menu-editor__move">
      <button
        type="button"
        className="admin-button"
        aria-label={`Move ${item.name} up`}
        disabled={busy || index === 0}
        onClick={() => move(items, item.path, -1, parent)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        className="admin-button"
        aria-label={`Move ${item.name} down`}
        disabled={busy || index === items.length - 1}
        onClick={() => move(items, item.path, 1, parent)}
      >
        <ArrowDown size={16} />
      </button>
    </span>
  );
  return (
    <section className="menu-editor">
      <div className="admin-heading">
        <div>
          <h2>Website menus</h2>
          <p>Rename links and put them in the order visitors should see.</p>
        </div>
        <button
          type="button"
          className="admin-button primary"
          disabled={!dirty || busy}
          onClick={() => save().catch(() => {})}
        >
          <Save size={16} />
          {busy ? 'Saving…' : 'Save menu'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {pagesError && (
        <p role="status">Added pages could not be loaded. Their existing names will be kept.</p>
      )}
      {groups.map((group, index) => (
        <section key={group.path} className="admin-panel menu-editor__group">
          <div className="menu-editor__row">
            <label>
              Section name
              <input
                aria-label={`${group.name} section name`}
                maxLength={80}
                disabled={busy}
                value={draft.labels[group.path] ?? group.name}
                onChange={(event) => changeLabel(group.path, event.target.value)}
              />
            </label>
            {arrows(groups, group, index)}
          </div>
          {group.children.length > 0 && (
            <details>
              <summary>Pages in this section · {group.children.length}</summary>
              {group.children.map((page, pageIndex) => (
                <div className="menu-editor__row" key={page.path}>
                  {page.path === group.path ? (
                    <span className="menu-editor__overview">
                      {page.name}
                      <small>Section overview</small>
                    </span>
                  ) : (
                    <label>
                      <span className="sr-only">{page.name} link name</span>
                      <input
                        aria-label={`${page.name} link name`}
                        maxLength={80}
                        disabled={busy}
                        value={draft.labels[page.path] ?? page.name}
                        onChange={(event) => changeLabel(page.path, event.target.value)}
                      />
                    </label>
                  )}
                  {arrows(group.children, page, pageIndex, group.path)}
                </div>
              ))}
            </details>
          )}
        </section>
      ))}
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Restore the original menu names and order? Save to publish.'))
              setDraft(readNavigationConfiguration('{}'));
          }}
        >
          <RotateCcw size={16} />
          Restore original menu
        </button>
      </div>
    </section>
  );
}
