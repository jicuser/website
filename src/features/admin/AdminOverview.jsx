import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { CERTIFICATES_ENABLED } from '@/lib/certificates';
import { ADMIN_GROUPS, ADMIN_SECTIONS } from '@/content/adminNavigation';
import { loadAdminOverview } from './overview';
import '@/styles/admin-overview.css';

export default function AdminOverview({ onChoose, icons }) {
  const auth = useAuth();
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ busy: true, data: {} });
  useEffect(() => {
    const controller = new AbortController();
    setResult({ busy: true, data: {} });
    loadAdminOverview(supabase, {
      can: auth.can,
      certificatesEnabled: CERTIFICATES_ENABLED,
      signal: controller.signal,
    }).then((data) => {
      if (!controller.signal.aborted) setResult({ busy: false, data });
    });
    return () => controller.abort();
  }, [auth.can, revision]);
  const tasks = ADMIN_SECTIONS.filter(
    (item) => item.id !== 'dashboard' && auth.can(item.permission),
  );
  const filtered = tasks.filter((item) =>
    `${item.name} ${item.description} ${item.group}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const cards = [
    ...(auth.can('forms_contact')
      ? [
          {
            id: 'messages',
            title: 'Messages to answer',
            detail: 'New messages and service enquiries',
            value: result.data.messages?.value,
            failed: result.data.messages?.error,
          },
        ]
      : []),
    ...(auth.can('forms')
      ? [
          {
            id: 'forms',
            title: 'Form responses to review',
            detail: 'Across your accessible custom forms',
            value: result.data.forms?.value?.waiting,
            failed: result.data.forms?.error,
          },
        ]
      : []),
    ...(CERTIFICATES_ENABLED && auth.can('certificates')
      ? [
          {
            id: 'certificates',
            title: 'Certificates to review',
            detail: 'Requests awaiting a decision',
            value: result.data.certificates?.value,
            failed: result.data.certificates?.error,
          },
        ]
      : []),
  ];
  const summary = result.data.forms?.value;
  const total = summary ? summary.waiting + summary.complete : 0;
  return (
    <div className="admin-overview">
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">Your centre, at a glance</p>
          <h1>Welcome{auth.profile?.display_name ? `, ${auth.profile.display_name}` : ''}.</h1>
          <p>See what needs attention, then get straight to the task.</p>
        </div>
        <button
          className="admin-button"
          type="button"
          disabled={result.busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {result.busy ? 'Refreshing…' : 'Refresh overview'}
        </button>
      </section>
      {cards.length > 0 && (
        <section aria-labelledby="admin-attention-title">
          <h2 id="admin-attention-title">Needs attention</h2>
          <div className="admin-attention-grid">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onChoose(card.id)}
                aria-label={`Open ${card.title.toLowerCase()}`}
              >
                <span>{card.title}</span>
                <strong>
                  {result.busy
                    ? '…'
                    : card.failed || card.value == null
                      ? 'Unavailable'
                      : card.value.toLocaleString('en-GB')}
                </strong>
                <small>{card.failed ? 'Open the area to retry loading.' : card.detail}</small>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}
      {summary && (
        <section className="admin-work-summary" aria-labelledby="admin-progress-title">
          <div>
            <h2 id="admin-progress-title">Form response progress</h2>
            <p>
              {summary.complete} completed · {summary.waiting} awaiting review · {summary.actions}{' '}
              open actions
            </p>
            <small>Across {summary.forms} accessible custom forms (up to 500).</small>
          </div>
          {total ? (
            <div className="admin-progress">
              <meter
                min={0}
                max={total}
                value={summary.complete}
                aria-label="Completed form responses"
              />
              <strong>{Math.round((summary.complete / total) * 100)}% completed</strong>
            </div>
          ) : (
            <span className="admin-zero-state">
              <CheckCircle2 size={18} aria-hidden="true" />
              No responses recorded
            </span>
          )}
        </section>
      )}
      <section className="admin-tools" aria-labelledby="admin-tools-title">
        <div className="admin-heading">
          <div>
            <h2 id="admin-tools-title">Your workspace</h2>
            <p>Find a task by name or area.</p>
          </div>
          <label className="admin-tool-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Find an admin task</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pages, prayer times, staff…"
            />
          </label>
        </div>
        {ADMIN_GROUPS.filter((group) => filtered.some((task) => task.group === group)).map(
          (group) => (
            <section className="admin-tool-group" key={group} aria-label={group}>
              <h3>{group}</h3>
              <div className="admin-tool-list">
                {filtered
                  .filter((task) => task.group === group)
                  .map(({ id, name, description }) => {
                    const Icon = icons[id];
                    return (
                      <button key={id} type="button" aria-label={name} onClick={() => onChoose(id)}>
                        <Icon size={22} aria-hidden="true" />
                        <span>
                          <strong>{name}</strong>
                          <small>{description}</small>
                        </span>
                        <ArrowRight size={17} aria-hidden="true" />
                      </button>
                    );
                  })}
              </div>
            </section>
          ),
        )}
        {!filtered.length && (
          <p role="status">No tasks match “{search}”. Try pages, forms or prayer.</p>
        )}
      </section>
      <section className="admin-account-help">
        <div>
          <h3>Member & family portal</h3>
          <p>Open your account view for the learning and records available to you.</p>
        </div>
        <Link className="admin-button" to="/portal">
          Open portal <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
