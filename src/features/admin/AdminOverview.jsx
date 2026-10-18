import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RefreshCw, Search, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { CERTIFICATES_ENABLED } from '@/lib/certificates';
import { ADMIN_GROUPS, ADMIN_SECTIONS } from '@/content/adminNavigation';
import { loadAdminOverview } from './overview';
import { findAdminTasks } from './taskNavigation';
import '@/styles/admin-overview.css';

const GROUP_HELP = {
  'Enquiries & forms': 'Respond to people and follow up their requests.',
  'Website content': 'Keep the information your community sees current.',
  'Prayer & displays': 'Manage the timetable, centre screens and live video.',
  'Centre operations': 'Look after payments and community fundraising.',
  'Staff & records': 'Manage staff access and review centre records.',
};

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
  const tasks = findAdminTasks(ADMIN_SECTIONS, auth.can);
  const filtered = findAdminTasks(tasks, auth.can, search);
  const cards = [
    ...(auth.can('forms_contact')
      ? [
          {
            id: 'messages',
            title: 'Messages to answer',
            detail: 'New messages and service enquiries',
            empty: 'No new contact messages.',
            action: 'Open contact messages',
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
            detail: 'New responses to the forms you work on',
            empty: 'No new responses to review.',
            action: 'Open forms & responses',
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
            empty: 'No requests awaiting a decision.',
            action: 'Open certificates',
            value: result.data.certificates?.value,
            failed: result.data.certificates?.error,
          },
        ]
      : []),
  ];
  const summary = result.data.forms?.value;
  const total = summary ? summary.waiting + summary.complete : 0;
  const unavailable = !result.busy && cards.some((card) => card.failed || card.value == null);
  return (
    <div className="admin-overview">
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">Staff overview</p>
          <h1>Welcome{auth.profile?.display_name ? `, ${auth.profile.display_name}` : ''}.</h1>
          <p>Review new enquiries and find what you need to look after the centre.</p>
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
        <section className="admin-attention" aria-labelledby="admin-attention-title">
          <div className="admin-overview-section-heading">
            <h2 id="admin-attention-title">Needs attention</h2>
            <p>New messages and requests in the areas you manage.</p>
          </div>
          <div className="admin-attention-grid" aria-busy={result.busy}>
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onChoose(card.id)}
                aria-label={`Open ${card.title.toLowerCase()}`}
                data-state={
                  unavailable && (card.failed || card.value == null) ? 'unavailable' : undefined
                }
              >
                <span>{card.title}</span>
                <strong
                  className={
                    result.busy || card.failed || card.value == null
                      ? 'admin-attention-word'
                      : undefined
                  }
                >
                  {result.busy
                    ? 'Checking…'
                    : card.failed || card.value == null
                      ? 'Unable to load'
                      : card.value.toLocaleString('en-GB')}
                </strong>
                <small>
                  {result.busy
                    ? 'Checking the latest total.'
                    : card.failed || card.value == null
                      ? 'You can still open this area, or refresh to try again.'
                      : card.value === 0
                        ? card.empty
                        : card.detail}
                </small>
                <span className="admin-attention-link">
                  {card.action} <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
          {unavailable && (
            <p className="admin-overview-note" role="status">
              Some totals could not be loaded. Your other staff tools are still available below.
            </p>
          )}
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
            <small>
              Across {summary.forms.toLocaleString('en-GB')}{' '}
              {summary.forms === 1 ? 'form' : 'forms'} you can access
              {summary.forms === 500 ? ' (showing up to 500 forms)' : ''}.
            </small>
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
            <h2 id="admin-tools-title">What would you like to do?</h2>
            <p>Choose an area, or search for a task.</p>
          </div>
          <label className="admin-tool-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Find an admin task</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try prayer times, invoices or staff…"
              aria-describedby={search.trim() ? 'admin-task-search-result' : undefined}
            />
          </label>
        </div>
        {search.trim() && (
          <p className="admin-search-result" id="admin-task-search-result" role="status">
            {filtered.length} {filtered.length === 1 ? 'task matches' : 'tasks match'} your search.
          </p>
        )}
        {ADMIN_GROUPS.filter((group) => filtered.some((task) => task.group === group)).map(
          (group) => (
            <section className="admin-tool-group" key={group} aria-label={group}>
              <div className="admin-tool-group-heading">
                <h3>{group}</h3>
                <p>{GROUP_HELP[group]}</p>
              </div>
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
          <div className="admin-task-empty">
            <Search size={24} aria-hidden="true" />
            {tasks.length ? (
              <>
                <h3>No tasks found for “{search.trim()}”</h3>
                <p>Try a shorter word, such as pages, forms or prayer.</p>
                <button className="admin-button" type="button" onClick={() => setSearch('')}>
                  Show all my tasks
                </button>
              </>
            ) : (
              <>
                <h3>No staff tools are assigned to this account</h3>
                <p>Your centre owner can help if you need access to another area.</p>
              </>
            )}
          </div>
        )}
      </section>
      <section className="admin-account-help">
        <div className="admin-personal-account">
          <UserCircle2 size={24} aria-hidden="true" />
          <div>
            <h3>Your personal account</h3>
            <p>View your own learning, family information and records.</p>
          </div>
        </div>
        <Link className="admin-button" to="/portal?workspace=personal">
          Open my account <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
