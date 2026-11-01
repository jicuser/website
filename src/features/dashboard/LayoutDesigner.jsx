import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Save, Undo2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { AUDIENCES, SCOPES, arrangeWidgets, moveWidget, normaliseLayout, validateLayout } from './model';
import { dashboardCatalogue } from './catalogue';
export default function LayoutDesigner({ initialScope, initialAudience, onClose, onSaved }) {
  const [scope, setScope] = useState(initialScope), [audience, setAudience] = useState(initialAudience);
  const [draft, setDraft] = useState(normaliseLayout(null)), [baseline, setBaseline] = useState(normaliseLayout(null));
  const [version, setVersion] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [revision, setRevision] = useState(0);
  const [phone, setPhone] = useState(false);
  const mutation = useRef(false), heading = useRef(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const catalogue = dashboardCatalogue(scope), ordered = arrangeWidgets(catalogue, draft, true);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setMessage('');
    supabase.from('dashboard_templates').select('layout,version').eq('scope', scope).eq('audience', audience).maybeSingle().abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error) { setError('Dashboard settings are unavailable. Ask the maintainer to apply the dashboard migration before saving.'); return; }
        const clean = normaliseLayout(data?.layout);
        setDraft(clean); setBaseline(clean); setVersion(data?.version || 0);
      }).catch(() => { if (!controller.signal.aborted) setError('Dashboard settings could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, audience, revision]);
  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const discard = () => !dirty || window.confirm('Discard your unsaved dashboard changes?');
  async function save() {
    if (mutation.current || loading || error) return false;
    mutation.current = true; setBusy(true); setMessage('');
    try {
      const clean = validateLayout(draft, catalogue.map((item) => item.id));
      const { data, error: failure } = await supabase.rpc('save_dashboard_template', { p_scope: scope, p_audience: audience, p_layout: clean, p_version: version });
      if (failure) throw failure;
      setVersion(data.version); setDraft(clean); setBaseline(clean);
      setMessage('Dashboard saved. Access permissions have not changed.'); onSaved(); return true;
    } catch (failure) { setMessage(failure.message || 'Save failed. Your draft is still here.'); return false; }
    finally { mutation.current = false; setBusy(false); }
  }
  useRegisterAdminSave(save, dirty, 'Save dashboard layout', busy || loading);
  function reorder(source, target) { setDraft((value) => ({ ...value, order: moveWidget(ordered.map((item) => item.id), source, target) })); }
  return <section className="jic-layout-designer" aria-labelledby="layout-designer-title">
    <header className="jic-board-heading"><div><p className="jic-board-note">Dashboard templates</p><h3 id="layout-designer-title" tabIndex={-1} ref={heading}>Arrange, preview, save</h3></div><button type="button" disabled={busy} onClick={() => { if (discard()) onClose(); }}><X size={16} aria-hidden="true" />Close</button></header>
    <p className="jic-board-note">This is a layout preview, not a view into someone’s account. People still see only tools allowed by their access permissions. Hidden shortcuts remain available under All tools.</p>
    <div className="jic-layout-selectors">
      <label>Area<select value={scope} disabled={busy} onChange={(event) => { if (discard()) setScope(event.target.value); }}>{SCOPES.map((value) => <option key={value} value={value}>{value === 'staff' ? 'Staff dashboard' : 'Member portal'}</option>)}</select></label>
      <label>Audience<select value={audience} disabled={busy} onChange={(event) => { if (discard()) setAudience(event.target.value); }}>{AUDIENCES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Spacing<select value={draft.density} disabled={busy || loading || !!error} onChange={(event) => setDraft((value) => ({ ...value, density: event.target.value }))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label>
    </div>
    {loading && <p role="status">Loading template…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></p>}
    {!loading && !error && <fieldset disabled={busy}>
      <div className="jic-layout-edit-list">{ordered.map((item, index) => <div className="jic-layout-edit-row" key={item.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!busy) reorder(event.dataTransfer.getData('text/plain'), item.id); }}>
        <span draggable={!busy} onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)} title="Drag to reorder"><GripVertical size={18} aria-hidden="true" /></span>
        <label><input type="checkbox" checked={!draft.hidden.includes(item.id)} onChange={(event) => setDraft((value) => ({ ...value, hidden: event.target.checked ? value.hidden.filter((id) => id !== item.id) : [...value.hidden, item.id] }))} />{item.name}</label>
        <button type="button" disabled={index === 0 || busy} aria-label={`Move ${item.name} earlier`} onClick={() => reorder(item.id, ordered[index - 1].id)}><ArrowUp size={16} /></button>
        <button type="button" disabled={index === ordered.length - 1 || busy} aria-label={`Move ${item.name} later`} onClick={() => reorder(item.id, ordered[index + 1].id)}><ArrowDown size={16} /></button>
      </div>)}</div>
      <div className="jic-board-heading"><h4>Template preview</h4><button type="button" aria-pressed={phone} onClick={() => setPhone((value) => !value)}>{phone ? 'Desktop preview' : 'Phone preview'}</button></div>
      <div className={`jic-layout-preview ${phone ? 'is-phone' : ''} density-${draft.density}`} aria-label="Template preview using tool names only">{arrangeWidgets(catalogue, draft).map((item) => <span key={item.id}>{item.name}</span>)}</div>
      <div className="jic-board-actions"><button type="button" disabled={!dirty || busy} onClick={save}><Save size={16} />{busy ? 'Saving…' : 'Save layout'}</button><button type="button" disabled={!dirty || busy} onClick={() => { setDraft(baseline); setMessage('Changes undone.'); }}><Undo2 size={16} />Undo changes</button><button type="button" disabled={busy} onClick={() => setDraft(normaliseLayout(null))}>Reset to standard</button></div>
    </fieldset>}
    {message && <p role="status">{message}</p>}
  </section>;
}
