import GuidedEditor from '@/components/admin/GuidedEditor';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, RotateCcw, Save } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import { configuredNavigation } from '@/lib/pageVisibility';
import { compactMenuNavigation } from '@/lib/publicNavigation';
import { NAVIGATION_CONTENT_KEY, readNavigationConfiguration } from '@/lib/navigationConfiguration';
import { supabase } from '@/lib/supabaseClient';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked } from '@/components/workspace/shared';
import useMenuReorder from './useMenuReorder';
import '@/styles/menu-editor.css';

export default function MenuEditor() {
  const { getContent, saveContent } = useContent();
  const raw = getContent(NAVIGATION_CONTENT_KEY, '{}');
  const [draft, setDraft] = useState(() => readNavigationConfiguration(raw));
  const [baseline, setBaseline] = useState(raw);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [moveOptions, setMoveOptions] = useState(null);
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
  const move = (items, path, target, parent) => {
    const paths = items.map((item) => item.path);
    const index = paths.indexOf(path);
    if (index < 0 || target < 0 || target >= paths.length || index === target) return;
    paths.splice(target, 0, paths.splice(index, 1)[0]);
    setDraft((current) =>
      parent
        ? { ...current, children: { ...current.children, [parent]: paths } }
        : { ...current, order: paths },
    );
    setMessage(`${items[index].name} moved to position ${target + 1}. Save menu to publish.`);
    setMoveOptions(null);
  };
  const { drag, handle, consumeDragClick } = useMenuReorder(move);
  const save = useCallback(async () => {
    if (!dirty || busy || drag) return;
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
  }, [draft, dirty, busy, drag, raw, baseline, saveContent]);
  useRegisterAdminSave(save, dirty, 'Save menu', busy || Boolean(drag));
  const arrows = (items, item, index, parent) => (
    <span className="menu-editor__move">
      <button
        type="button"
        className="admin-button"
        aria-label={`Move ${item.name} up`}
        disabled={busy || index === 0}
        onClick={() => move(items, item.path, index - 1, parent)}
      >
        <ArrowUp size={16} /> Move up
      </button>
      <button
        type="button"
        className="admin-button"
        aria-label={`Move ${item.name} down`}
        disabled={busy || index === items.length - 1}
        onClick={() => move(items, item.path, index + 1, parent)}
      >
        <ArrowDown size={16} /> Move down
      </button>
    </span>
  );
  const keyFor = (path, parent) => `${parent || ''}:${path}`;
  const grip = (items, item, parent) => (
    <button
      type="button"
      className="menu-editor__handle"
      aria-label={`Reorder ${item.name}`}
      aria-describedby="menu-reorder-help"
      aria-expanded={moveOptions === keyFor(item.path, parent)}
      disabled={busy || items.length < 2}
      {...handle(items, item.path, parent)}
      onClick={() => {
        if (consumeDragClick()) return;
        setMoveOptions((current) =>
          current === keyFor(item.path, parent) ? null : keyFor(item.path, parent),
        );
      }}
    >
      <GripVertical size={19} aria-hidden="true" />
    </button>
  );
  const rowState = (items, item, parent) => {
    if (!drag || drag.parent !== parent) return '';
    if (drag.path === item.path) return 'is-dragging';
    if (drag.items[drag.target]?.path !== item.path) return '';
    return drag.target < items.findIndex((row) => row.path === drag.path)
      ? 'drop-before'
      : 'drop-after';
  };
  return (
    <section className="menu-editor">
      <div className="admin-heading">
        <div>
          <h2>Website menus</h2>
          <p>Rename links or drag the handles to reorder.</p>
          <span className="sr-only" id="menu-reorder-help">
            Drag to reorder, use the up and down arrow keys, or tap for move buttons.
          </span>
        </div>
        <button
          type="button"
          className="admin-button primary"
          disabled={!dirty || busy || Boolean(drag)}
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
      <GuidedEditor label="Menu editing steps" disabled={busy || Boolean(drag)}>
        <div
          data-step="Arrange"
          data-help="Rename sections, then open a section to arrange its pages."
        >
          <div className="menu-editor__list" aria-label="Menu sections">
            {groups.map((group, index) => (
              <section
                key={group.path}
                className={`menu-editor__group ${rowState(groups, group)}`}
                data-menu-path={group.path}
                data-menu-parent=""
              >
                <div className="menu-editor__row">
                  {grip(groups, group)}
                  <label>
                    <span className="sr-only">Section name</span>
                    <input
                      aria-label={`${group.name} section name`}
                      maxLength={80}
                      disabled={busy}
                      value={draft.labels[group.path] ?? group.name}
                      onChange={(event) => changeLabel(group.path, event.target.value)}
                    />
                  </label>
                  {group.children.length > 0 ? (
                    <button
                      type="button"
                      className="menu-editor__expand"
                      aria-label={`Pages in ${group.name} · ${group.children.length}`}
                      aria-expanded={expanded === group.path}
                      disabled={busy || Boolean(drag)}
                      onClick={() =>
                        setExpanded((current) => (current === group.path ? null : group.path))
                      }
                    >
                      <small>{group.children.length}</small>
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="menu-editor__no-pages" />
                  )}
                </div>
                {moveOptions === keyFor(group.path) && arrows(groups, group, index)}
                {expanded === group.path && (
                  <div className="menu-editor__pages" aria-label={`${group.name} pages`}>
                    {group.children.map((page, pageIndex) => (
                      <div
                        className={`menu-editor__page ${rowState(group.children, page, group.path)}`}
                        key={page.path}
                        data-menu-path={page.path}
                        data-menu-parent={group.path}
                      >
                        <div className="menu-editor__row">
                          {grip(group.children, page, group.path)}
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
                        </div>
                        {moveOptions === keyFor(page.path, group.path) &&
                          arrows(group.children, page, pageIndex, group.path)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
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
        </div>
        <section data-step="Review" data-help="Check the names and order before saving the menu.">
          <h3>Menu preview</h3>
          <p>Saved page visibility still controls which links visitors can see.</p>
          <ol className="guided-menu-preview">
            {groups.map((group) => (
              <li key={group.path}>
                <details>
                  <summary>{group.name}</summary>
                  <ul>
                    {group.children.map((page) => (
                      <li key={page.path}>{page.name}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="admin-button primary"
            disabled={!dirty || busy || Boolean(drag)}
            onClick={() => save().catch(() => {})}
          >
            <Save size={16} />
            {busy ? 'Saving…' : 'Save menu'}
          </button>
        </section>
      </GuidedEditor>
    </section>
  );
}
