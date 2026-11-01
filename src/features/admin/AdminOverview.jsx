import React, { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { CERTIFICATES_ENABLED } from '@/lib/certificates';
import { ADMIN_SECTIONS } from '@/content/adminNavigation';
import { loadAdminOverview } from './overview';
import { findAdminTasks } from './taskNavigation';
import DashboardBoard from '@/features/dashboard/DashboardBoard';
import '@/styles/admin-overview.css';
export default function AdminOverview({ onChoose, icons }) {
  const auth = useAuth();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ busy: true, data: {} });
  useEffect(() => {
    const controller = new AbortController(); setResult({ busy: true, data: {} });
    loadAdminOverview(supabase, { can: auth.can, certificatesEnabled: CERTIFICATES_ENABLED, signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult({ busy: false, data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ busy: false, data: {} }); });
    return () => controller.abort();
  }, [auth.can, revision]);
  const cards = [
    ...(auth.can('forms') ? [{ id: 'forms', title: 'Form responses to review', value: result.data.forms?.value?.waiting, failed: result.data.forms?.error, action: 'Open forms' }] : []),
    ...(CERTIFICATES_ENABLED && auth.can('certificates') ? [{ id: 'certificates', title: 'Certificates to review', value: result.data.certificates?.value, failed: result.data.certificates?.error, action: 'Open certificates' }] : []),
  ];
  const tasks = findAdminTasks(ADMIN_SECTIONS, auth.can).filter((item) => item.id !== 'dashboard').map((item) => ({ ...item, icon: icons[item.id] }));
  const summary = result.data.forms?.value, total = summary ? summary.waiting + summary.complete : 0;
  return <div className="admin-overview">
    <section className="admin-welcome"><div><p className="admin-eyebrow">Staff home</p><h1>Welcome{auth.profile?.display_name ? `, ${auth.profile.display_name}` : ''}</h1><p>Your work and the tools available to your account.</p></div></section>
    {cards.length > 0 && <section className="admin-attention" aria-labelledby="admin-attention-title"><div className="admin-overview-section-heading"><h2 id="admin-attention-title">Needs attention</h2><button className="admin-overview-refresh" type="button" disabled={result.busy} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15} aria-hidden="true" />{result.busy ? 'Refreshing…' : 'Refresh totals'}</button></div><div className="admin-attention-grid" aria-busy={result.busy}>{cards.map((card) => {
      const unavailable = card.failed || card.value == null;
      const value = result.busy ? 'Checking…' : unavailable ? 'Unable to load' : card.value.toLocaleString('en-GB');
      return <button key={card.id} type="button" onClick={() => onChoose(card.id)} aria-label={`${card.action}: ${value}`} data-state={!result.busy && unavailable ? 'unavailable' : undefined}><span>{card.title}</span><strong className={result.busy || unavailable ? 'admin-attention-word' : undefined}>{value}</strong><small>{result.busy ? 'Checking the latest total.' : unavailable ? 'Open this area or refresh to try again.' : card.value === 0 ? 'Nothing awaiting review.' : 'Records available to your account.'}</small><span className="admin-attention-link">{card.action}<ArrowRight size={16} aria-hidden="true" /></span></button>;
    })}</div></section>}
    {summary && <details className="admin-work-summary"><summary>Form response progress</summary><div className="admin-work-summary-content"><p>{summary.complete} completed · {summary.waiting} awaiting review · {summary.actions} open follow-ups</p>{total > 0 && <meter min={0} max={total} value={summary.complete} aria-label="Completed form responses" />}</div></details>}
    <DashboardBoard scope="staff" auth={auth} items={tasks} onChoose={onChoose} />
  </div>;
}
