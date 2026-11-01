import React, { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LayoutGrid, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { findAdminTasks } from '@/features/admin/taskNavigation';
import { arrangeWidgets, audienceFor, groupWidgets } from './model';
import './dashboard.css';
import './dashboard-groups.css';
const LayoutDesigner = lazy(() => import('./LayoutDesigner'));

export default function DashboardBoard({ scope, auth, items, title = 'Your tools', onChoose }) {
  const [layout, setLayout] = useState(null);
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  const [area, setArea] = useState(null);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  const areaHeading = useRef(null);
  const previousArea = useRef(null);
  const id = useId();
  const staff = scope === 'staff';
  const audience = audienceFor(auth, scope);

  useEffect(() => {
    const controller = new AbortController();
    setLayout(null);
    setFailed(false);
    supabase
      .from('dashboard_templates')
      .select('layout')
      .eq('scope', scope)
      .eq('audience', audience)
      .maybeSingle()
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (!controller.signal.aborted) {
          setFailed(!!error);
          setLayout(error ? null : data?.layout || null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [scope, audience, auth.user?.id, revision]);

  useEffect(() => {
    if (area) areaHeading.current?.focus({ preventScroll: true });
    else if (previousArea.current)
      document.getElementById(previousArea.current)?.focus({ preventScroll: true });
  }, [area]);

  // The caller has already filtered permissions. Search retains the existing
  // keyword, group and multi-word matching without expanding that permission set.
  const ordered = arrangeWidgets(items, layout, all || !!search.trim());
  const visible = findAdminTasks(ordered, () => true, search);
  const groups = groupWidgets(visible);
  const openedArea = !search.trim() && groups.find((group) => group.name === area);
  const grouped = staff && !search.trim() && !openedArea && visible.length > 3;

  function renderTile(item) {
    const Icon = item.icon || LayoutGrid;
    const content = (
      <>
        <Icon size={21} aria-hidden="true" />
        <span>
          <strong>{item.name}</strong>
          {item.description && <small>{item.description}</small>}
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </>
    );
    return item.to ? (
      <Link className="jic-board-tile" to={item.to} key={item.id} aria-label={item.name}>
        {content}
      </Link>
    ) : (
      <button
        type="button"
        className="jic-board-tile"
        key={item.id}
        aria-label={item.name}
        title={item.description}
        onClick={() => onChoose?.(item.id)}
      >
        {content}
      </button>
    );
  }

  return (
    <section
      className={`jic-dashboard-board density-${layout?.density === 'comfortable' ? 'comfortable' : 'compact'}`}
      aria-labelledby={id}
    >
      <header className="jic-board-heading">
        <h2 id={id}>{title}</h2>
        <div className="jic-board-actions">
          {openedArea ? (
            <button type="button" onClick={() => setArea(null)}>
              <ArrowLeft size={16} aria-hidden="true" /> All tools
            </button>
          ) : (
            <button type="button" aria-pressed={all} onClick={() => setAll((value) => !value)}>
              <LayoutGrid size={16} aria-hidden="true" /> {all ? 'Dashboard' : 'All tools'}
            </button>
          )}
          {staff && auth.can('users') && (
            <button type="button" aria-expanded={editing} onClick={() => setEditing(true)}>
              <SlidersHorizontal size={16} aria-hidden="true" /> Arrange dashboards
            </button>
          )}
        </div>
      </header>
      <label className="jic-board-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{staff ? 'Find an admin task' : 'Find a dashboard tool'}</span>
        <input
          type="search"
          value={search}
          placeholder="Find a tool…"
          onChange={(event) => {
            previousArea.current = null;
            setArea(null);
            setSearch(event.target.value);
          }}
        />
      </label>
      {failed && staff && (
        <p className="jic-board-note" role="status">
          Using the standard layout.{' '}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Retry saved layout
          </button>
        </p>
      )}
      {openedArea && (
        <div className="admin-area-heading">
          <h3 ref={areaHeading} tabIndex={-1}>{openedArea.name}</h3>
        </div>
      )}
      {grouped ? (
        <div className="admin-tool-list admin-area-tiles">
          {groups.map((group) => {
            const first = group.items[0];
            const Icon = first.icon || LayoutGrid;
            const tileId = `${id}-area-${first.id}`;
            return (
              <button
                key={group.name}
                id={tileId}
                type="button"
                className="admin-tool-tile"
                aria-label={group.items.length === 1 ? first.name : group.name}
                onClick={() => {
                  if (group.items.length === 1) onChoose?.(first.id);
                  else {
                    previousArea.current = tileId;
                    setArea(group.name);
                  }
                }}
              >
                <Icon size={22} aria-hidden="true" />
                <span>
                  <strong>{group.items.length === 1 ? first.name : group.name}</strong>
                  <small>{group.items.length === 1 ? first.description : `${group.items.length} tools`}</small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className={`jic-board-grid ${staff ? 'admin-tool-list' : ''}`}>
          {(openedArea ? openedArea.items : visible).map(renderTile)}
        </div>
      )}
      {!visible.length && (
        <p role="status">
          {search
            ? 'No matching tools. Try a shorter search.'
            : 'No shortcuts are shown. Open All tools to see everything available to your account.'}
        </p>
      )}
      {editing && (
        <Suspense fallback={<p role="status">Opening dashboard editor…</p>}>
          <LayoutDesigner
            initialScope={scope}
            initialAudience={audience}
            onClose={() => setEditing(false)}
            onSaved={() => setRevision((value) => value + 1)}
          />
        </Suspense>
      )}
    </section>
  );
}
