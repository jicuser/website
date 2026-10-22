import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, FileText, Plus, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useAdminSave } from '@/context/AdminSaveContext';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked } from '@/components/workspace/shared';
import CustomFormsBuilder from '@/components/workspace/CustomFormsBuilder';
import CustomFormsInbox from '@/components/workspace/CustomFormsInbox';
import FormActions from './FormActions';
import ScheduleManager from './ScheduleManager';
import { formStatus, workflowChanged, pageUrl } from '@/lib/pageContent';
import { serviceEnquiry } from '@/lib/serviceEnquiries';
import { permittedBuiltInForms } from '@/lib/customForms';
import '@/styles/workspace.css';
import '@/styles/custom-forms.css';
import '@/styles/content-workflow.css';

function useFormSummaries() {
  const { user } = useAuth();
  const read = useCallback(
    (signal) => checked(supabase.rpc('admin_forms_overview').abortSignal(signal)),
    [user?.id],
  );
  return useAdminRecords(read);
}

function useLegacyFormCounts(kindKey) {
  const { user } = useAuth();
  const read = useCallback(
    async (signal) => {
      const kinds = kindKey ? kindKey.split('|').filter(Boolean) : [];
      const pairs = await Promise.all(
        kinds.map(async (kind) => {
          const summary = await checked(
            supabase
              .rpc('search_form_submissions', {
                p_search: '',
                p_kind: kind,
                p_form_id: null,
                p_status: null,
                p_from: null,
                p_to: null,
                p_offset: 0,
                p_limit: 1,
                p_oldest: false,
                p_mine: false,
              })
              .abortSignal(signal),
          );
          return [
            kind,
            {
              total: summary?.total || 0,
              new_count: summary?.new_count || 0,
              done_count: summary?.done_count || 0,
            },
          ];
        }),
      );
      return Object.fromEntries(pairs);
    },
    [user?.id, kindKey],
  );
  return useAdminRecords(read);
}

export function FormWorkspace({ formId, onClose, registerBack }) {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: forms, loading, error, reload } = useFormSummaries();
  const form = forms?.find((item) => item.id === formId);
  const tab = ['overview', 'responses', 'actions'].includes(params.get('tab'))
    ? params.get('tab')
    : 'overview';
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const closeEditor = useCallback(() => setEditor(null), []);
  const chooseTab = (next) => {
    if (tab === next) return;
    setParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set('tab', next);
      return updated;
    });
  };
  useEffect(() => {
    if (!registerBack || editor) return undefined;
    registerBack(onClose);
    return () => registerBack(null);
  }, [registerBack, editor, onClose]);
  async function act(work) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (failure) {
      setMessage(failure.message || 'Could not complete this change.');
    } finally {
      setBusy(false);
    }
  }
  if (editor)
    return (
      <CustomFormsBuilder
        definition={editor}
        registerBack={registerBack}
        onClose={closeEditor}
        onSaved={() => {
          setEditor(null);
          reload();
        }}
      />
    );
  if (!form)
    return (
      <section>
        <p role={error ? 'alert' : 'status'}>
          {error || (loading ? 'Loading form…' : 'This form is not available to your account.')}
        </p>
        <button className="admin-button" onClick={reload}>
          Retry form
        </button>
        {onClose && (
          <button className="admin-button" onClick={onClose}>
            Back to forms
          </button>
        )}
      </section>
    );
  const assignments = form.people.map((person) => ({ ...person, form_id: form.id }));
  return (
    <section
      className="community-workspace custom-forms-admin"
      aria-label={`${form.title} management`}
    >
      <div className="admin-heading">
        <div>
          <h3>{form.title}</h3>
          <span className="content-status">{formStatus(form)}</span>
        </div>
        {onClose && (
          <button className="admin-button" onClick={onClose}>
            All forms
          </button>
        )}
      </div>
      <nav className="admin-actions" aria-label="Form management">
        <button
          className="admin-button"
          aria-pressed={tab === 'overview'}
          onClick={() => chooseTab('overview')}
        >
          Form details
        </button>
        <button
          className="admin-button"
          aria-pressed={tab === 'responses'}
          onClick={() => chooseTab('responses')}
        >
          Responses ({form.new_count + form.done_count})
        </button>
        <button
          className="admin-button"
          aria-pressed={tab === 'actions'}
          onClick={() => chooseTab('actions')}
        >
          Follow-ups ({form.open_actions})
        </button>
      </nav>
      {message && <p role="status">{message}</p>}
      {tab === 'overview' && (
        <>
          <p>{form.description}</p>
          <div className="content-summary-grid">
            <div>
              <strong>{form.new_count}</strong>
              <span>Awaiting response</span>
            </div>
            <div>
              <strong>{form.done_count}</strong>
              <span>Completed responses</span>
            </div>
            <div>
              <strong>{form.open_actions}</strong>
              <span>Follow-ups waiting</span>
            </div>
          </div>
          <h4>Responsible people & access</h4>
          {form.people.length ? (
            <dl className="content-people">
              {form.people.map((person) => (
                <div key={`${person.user_id}-${person.role}`}>
                  <dt>
                    {
                      { responsible: 'Responsible', manager: 'Form editor', watcher: 'Following' }[
                        person.role
                      ]
                    }
                  </dt>
                  <dd>
                    {person.display_name || 'Staff member'}
                    {!person.active && ' · Access disabled'}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Choose a responsible person before publishing.</p>
          )}
          <h4>Where this form is used</h4>
          {serviceEnquiry(form.slug) && (
            <p>
              <Link to={serviceEnquiry(form.slug).page} target="_blank" rel="noreferrer">
                {serviceEnquiry(form.slug).pageName}
              </Link>{' '}
              · Service enquiry button
            </p>
          )}
          {form.pages?.length ? (
            form.pages.map((page) => (
              <p key={page.id}>
                {page.published ? (
                  <Link to={pageUrl(page)} target="_blank" rel="noreferrer">
                    {page.title}
                  </Link>
                ) : (
                  page.title
                )}{' '}
                · {page.placement} · {page.published ? 'Page live' : 'Page hidden'}
              </p>
            ))
          ) : !serviceEnquiry(form.slug) ? (
            <p>Standalone form. Link it from a poster or content page when needed.</p>
          ) : null}
          <p>
            Assignments apply to future responses. Reassign unfinished follow-ups in Follow-ups when
            responsibility changes.
          </p>
          <div className="admin-actions">
            {form.can_manage && (
              <button
                className="admin-button primary"
                disabled={busy}
                onClick={() =>
                  act(async () =>
                    setEditor(
                      await checked(
                        supabase.from('custom_forms').select('*').eq('id', form.id).single(),
                      ),
                    ),
                  )
                }
              >
                Edit form & assignments
              </button>
            )}
            {form.published_version && (
              <>
                <Link
                  className="admin-button"
                  to={`/forms/${form.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View form
                </Link>
                <button
                  className="admin-button"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const url = new URL(`/forms/${form.slug}`, location.origin).href;
                      try {
                        await navigator.clipboard.writeText(url);
                        setMessage('Form link copied.');
                      } catch {
                        setMessage(`Copy this form address: ${url}`);
                      }
                    })
                  }
                >
                  Copy link
                </button>
                {form.can_manage && (
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        if (
                          form.enabled &&
                          !window.confirm(
                            'Close this form to new responses? Existing responses and actions are kept.',
                          )
                        )
                          return;
                        await checked(
                          supabase.rpc('set_custom_form_open', {
                            p_form_id: form.id,
                            p_enabled: !form.enabled,
                          }),
                        );
                        workflowChanged();
                        await reload();
                      })
                    }
                  >
                    {form.enabled ? 'Close form' : 'Reopen form'}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
      {tab === 'responses' && (
        <CustomFormsInbox
          key={form.id}
          auth={auth}
          definitions={[form]}
          assignments={assignments}
          formId={form.id}
        />
      )}
      {tab === 'actions' && (
        <FormActions
          key={form.id}
          formId={form.id}
          onViewResponses={() => chooseTab('responses')}
        />
      )}
    </section>
  );
}

function EntryTiles({ auth, loading, onChoose, onCreate }) {
  return (
    <div className="admin-task-grid forms-entry-tiles">
      <button onClick={() => onChoose({ view: 'forms' })}>
        <FileText />
        <strong>All forms</strong>
        <span>Registration and service forms, including drafts and closed forms.</span>
      </button>
      {(auth.isOwner || auth.can('forms_manage')) && (
        <button onClick={onCreate}>
          <Plus />
          <strong>Create form</strong>
          <span>Questions, responsible people and publishing.</span>
        </button>
      )}
      <button onClick={() => onChoose({ view: 'responses' })}>
        <ClipboardList />
        <strong>Responses & follow-ups</strong>
        <span>Submitted information and outstanding work.</span>
      </button>
      {(auth.isOwner || auth.can('events')) && (
        <button onClick={() => onChoose({ view: 'schedule' })}>
          <CalendarDays />
          <strong>Schedule</strong>
          <span>Hall availability and course/class times.</span>
        </button>
      )}
      {loading && <span className="sr-only">Loading forms</span>}
    </div>
  );
}

function BuiltInFormCards({ forms, onChoose, counts, loading, error }) {
  return forms.map(({ kind, title }) => {
    const summary = counts?.[kind];
    return (
      <button
        className="admin-panel content-form-card"
        key={kind}
        onClick={() => onChoose({ view: 'responses', kind })}
      >
        <span className="content-status">Live</span>
        <strong>{title}</strong>
        <span className="form-card-metrics">
          <b>{summary ? summary.new_count : loading ? '…' : '—'}</b> waiting
          <b>{summary ? summary.done_count : loading ? '…' : '—'}</b> completed
        </span>
        <span className="workspace-meta">Review responses</span>
        {error && (
          <span className="workspace-meta">Counts unavailable · tap to open responses</span>
        )}
      </button>
    );
  });
}

function FormCatalogue({ view, responseKind, onChoose, onCreate }) {
  const auth = useAuth();
  const { data, loading, error, reload } = useFormSummaries();
  const forms = data || [];
  const builtInForms = permittedBuiltInForms(auth);
  const {
    data: legacyCounts,
    loading: legacyLoading,
    error: legacyError,
  } = useLegacyFormCounts(builtInForms.map(({ kind }) => kind).join('|'));
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const listed = forms.filter(
    (form) =>
      (status === 'all' || formStatus(form) === status) &&
      (category === 'all' ||
        (category === 'services' ? !!serviceEnquiry(form.slug) : !serviceEnquiry(form.slug))),
  );
  const listedBuiltIn = builtInForms.filter(
    (form) =>
      (status === 'all' || status === 'Live') && (category === 'all' || category === form.category),
  );

  return (
    <section className="community-workspace custom-forms-admin">
      {['forms', 'schedule', 'home'].includes(view) && (
        <div className="admin-heading">
          <div>
            <h2>{view === 'schedule' ? 'Schedule' : 'Forms'}</h2>
            <p>
              {view === 'schedule'
                ? 'Hall availability and class times.'
                : 'Contact Us, registration and service forms are together here. Open a form to review its responses.'}
            </p>
          </div>
          {view === 'forms' && (auth.isOwner || auth.can('forms_manage')) && (
            <button className="admin-button primary" onClick={onCreate}>
              <Plus size={16} /> New form
            </button>
          )}
        </div>
      )}
      {view !== 'home' && (
        <nav className="forms-workspace-tabs" aria-label="Forms workspace">
          {[
            ['forms', 'Forms'],
            ['responses', 'Responses'],
            ['actions', 'Follow-ups'],
            ...(auth.isOwner || auth.can('events') ? [['schedule', 'Schedule']] : []),
          ].map(([id, title]) => (
            <button
              type="button"
              key={id}
              className="admin-button"
              aria-pressed={view === id}
              onClick={() => onChoose({ view: id })}
            >
              {title}
            </button>
          ))}
        </nav>
      )}
      {view === 'home' && (
        <EntryTiles auth={auth} loading={loading} onChoose={onChoose} onCreate={onCreate} />
      )}
      {error && (
        <p role="alert">
          {error}{' '}
          <button type="button" className="admin-button" disabled={loading} onClick={reload}>
            Retry forms
          </button>
        </p>
      )}

      {view === 'home' ? (
        <p className="mt-4">Choose an area above.</p>
      ) : view === 'schedule' ? (
        <ScheduleManager />
      ) : view === 'forms' ? (
        <>
          <details className="forms-catalogue-filters">
            <summary>
              Filter forms{category !== 'all' || status !== 'all' ? ' · Filtered' : ''}
            </summary>
            <div className="content-field-grid">
              <label>
                Form type
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">All forms</option>
                  <option value="services">Contact & service enquiries</option>
                  <option value="other">Registrations & other forms</option>
                </select>
              </label>
              <label>
                Show forms
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">All current forms</option>
                  <option>Live</option>
                  <option>Draft</option>
                  <option>Closed</option>
                </select>
              </label>
            </div>
          </details>
          {loading && !data && <p role="status">Loading forms…</p>}
          <div className="content-form-grid">
            <BuiltInFormCards
              forms={listedBuiltIn}
              onChoose={onChoose}
              counts={legacyCounts}
              loading={legacyLoading}
              error={legacyError}
            />
            {listed.map((form) => (
              <button
                className="admin-panel content-form-card"
                key={form.id}
                onClick={() => onChoose({ form: form.id })}
              >
                <span className="content-status">{formStatus(form)}</span>
                <strong>{form.title}</strong>
                <span className="form-card-metrics">
                  <b>{form.new_count}</b> waiting
                  <b>{form.done_count}</b> completed
                  {form.open_actions > 0 && (
                    <>
                      <b>{form.open_actions}</b> follow-ups
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
          {!loading && !listed.length && !error && !listedBuiltIn.length && (
            <p>No forms match this view.</p>
          )}
        </>
      ) : (
        <>
          {view === 'actions' ? (
            <FormActions onViewResponses={() => onChoose({ view: 'responses' })} />
          ) : (
            <CustomFormsInbox
              key={responseKind}
              auth={auth}
              initialKind={responseKind}
              definitions={forms}
              assignments={forms.flatMap((form) =>
                form.people.map((person) => ({ ...person, form_id: form.id })),
              )}
            />
          )}
        </>
      )}
    </section>
  );
}

export default function FormsManager({ registerBack }) {
  const { dirty } = useAdminSave();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const select = params.get('form');
  const view = params.get('view') || 'forms';
  const choose = useCallback(
    (changes) => {
      if (dirty && !window.confirm('Discard unsaved form changes?')) return;
      setCreating(false);
      setParams({ section: 'forms', ...changes });
    },
    [dirty, setParams],
  );
  const closeCreation = useCallback(() => setCreating(false), []);
  const closeWorkspace = useCallback(() => choose({ view: 'forms' }), [choose]);
  useEffect(() => {
    // Nested editors register their own Back action so their unsaved-change
    // checks apply to the toolbar as well as their local Close button.
    if (!registerBack || creating || select) return undefined;
    if (view !== 'forms') registerBack(() => choose({ view: 'forms' }));
    else registerBack(null);
    return () => registerBack(null);
  }, [registerBack, creating, select, view, choose]);
  if (creating)
    return (
      <CustomFormsBuilder
        registerBack={registerBack}
        onClose={closeCreation}
        onSaved={(saved) => {
          setCreating(false);
          setParams({ section: 'forms', form: saved.id });
        }}
      />
    );
  if (select)
    return (
      <FormWorkspace
        key={select}
        formId={select}
        registerBack={registerBack}
        onClose={closeWorkspace}
      />
    );
  return (
    <FormCatalogue
      view={view}
      responseKind={params.get('kind') || ''}
      onChoose={choose}
      onCreate={() => setCreating(true)}
    />
  );
}
