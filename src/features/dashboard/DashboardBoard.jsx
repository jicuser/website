import React, { lazy, Suspense, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { arrangeWidgets, audienceFor } from './model';
import './dashboard.css';
const LayoutDesigner = lazy(() => import('./LayoutDesigner'));
export default function DashboardBoard({ scope, auth, items, title = 'Your tools', onChoose }) {
  const [layout, setLayout] = useState(null);
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  const id = useId();
  const audience = audienceFor(auth, scope);
  useEffect(() => {
    const controller = new AbortController();
    setLayout(null); setFailed(false);
    supabase.from('dashboard_templates').select('layout').eq('scope', scope).eq('audience', audience).maybeSingle().abortSignal(controller.signal)
      .then(({ data, error }) => { if (!controller.signal.aborted) { setFailed(!!error); setLayout(error ? null : data?.layout || null); } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [scope, audience, auth.user?.id, revision]);
  const visible = arrangeWidgets(items, layout, all || !!search.trim()).filter((item) => `${item.name} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className={`jic-dashboard-board density-${layout?.density === 'comfortable' ? 'comfortable' : 'compact'}`} aria-labelledby={id}>
    <header className="jic-board-heading"><h2 id={id}>{title}</h2><div className="jic-board-actions"><button type="button" aria-pressed={all} onClick={() => setAll((value) => !value)}><LayoutGrid size={16} aria-hidden="true" />{all ? 'Dashboard' : 'All tools'}</button>{scope === 'staff' && auth.can('users') && <button type="button" aria-expanded={editing} onClick={() => setEditing(true)}><SlidersHorizontal size={16} aria-hidden="true" />Arrange dashboards</button>}</div></header>
    <label className="jic-board-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Find a dashboard tool</span><input type="search" value={search} placeholder="Find a tool…" onChange={(event) => setSearch(event.target.value)} /></label>
    {failed && scope === 'staff' && <p className="jic-board-note" role="status">Using the standard layout. <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry saved layout</button></p>}
    <div className="jic-board-grid">{visible.map((item) => {
      const Icon = item.icon || LayoutGrid;
      const content = <><Icon size={21} aria-hidden="true" /><span><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span><ArrowRight size={16} aria-hidden="true" /></>;
      return item.to ? <Link className="jic-board-tile" to={item.to} key={item.id}>{content}</Link> : <button type="button" className="jic-board-tile" key={item.id} onClick={() => onChoose?.(item.id)}>{content}</button>;
    })}</div>
    {!visible.length && <p role="status">{search ? 'No matching tools. Try a shorter search.' : 'No shortcuts are shown. Open All tools to see everything available to your account.'}</p>}
    {editing && <Suspense fallback={<p role="status">Opening dashboard editor…</p>}><LayoutDesigner initialScope={scope} initialAudience={audience} onClose={() => setEditing(false)} onSaved={() => setRevision((value) => value + 1)} /></Suspense>}
  </section>;
}
