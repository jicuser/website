import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { checked } from '@/components/workspace/shared';
import CustomFormsBuilder from '@/components/workspace/CustomFormsBuilder';
import FormsInbox from '@/components/admin/FormsInbox';
import FormResponses from './FormResponses';
import useWorkflowData from './useWorkflowData';
import { formStatus, pageUrl, workflowChanged } from '@/lib/pageContent';
import '@/styles/workspace.css';
import '@/styles/custom-forms.css';

export default function FormsAdmin({ initialFormId = '', initialView = 'overview' }) {
  const auth = useAuth();
  const [selected, setSelected] = useState(initialFormId);
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState('all');
  const [editor, setEditor] = useState(null);
  const [legacy, setLegacy] = useState(false);
  const load = useCallback(
    async () => ({
      forms: await checked(supabase.rpc('admin_form_catalogue')),
      pages: await checked(
        supabase.from('content_pages').select('id,slug,title,form_id,published,placement'),
      ),
    }),
    [],
  );
  const state = useWorkflowData(load);
  const forms = state.data?.forms || [];
  const form = forms.find((item) => item.id === selected);
  const open = (id, next = 'overview') => {
    setSelected(id);
    setView(next);
    setLegacy(false);
  };
  const canCreate = auth.isOwner || auth.can('forms_manage');
  return (
    <section className="content-workflow community-workspace custom-forms-admin">
      <div className="admin-heading">
        <div>
          <h2>Forms</h2>
          <p>Published forms, responsible people, responses and follow-up actions.</p>
        </div>
        <button className="admin-button" disabled={state.loading} onClick={state.refresh}>
          Refresh
        </button>
      </div>
      <div className="admin-actions">
        <button className="admin-button" onClick={() => open('')}>
          Current forms
        </button>
        {canCreate && (
          <button className="admin-button primary" onClick={() => setEditor({})}>
            Create form
          </button>
        )}
        <button
          className="admin-button"
          onClick={() => {
            open('', 'responses');
          }}
        >
          Responses
        </button>
        <button
          className="admin-button"
          onClick={() => {
            open('', 'actions');
          }}
        >
          Actions
        </button>
        <button
          className="admin-button"
          onClick={() => {
            setLegacy(true);
            setSelected('');
          }}
        >
          Contact, Madrasah & I’tikaf inbox
        </button>
      </div>
      {editor && (
        <CustomFormsBuilder
          key={editor.id || 'new'}
          definition={editor.id ? editor : null}
          onClose={() => setEditor(null)}
          onSaved={() => workflowChanged()}
        />
      )}
      {legacy ? (
        <FormsInbox />
      ) : state.error ? (
        <p role="alert">{state.error}</p>
      ) : !state.data ? (
        <p role="status">Loading forms…</p>
      ) : (
        <>
          {form && (
            <section className="admin-panel">
              <h3>{form.title}</h3>
              <p>
                {formStatus(form)} · Responsible:{' '}
                {form.responsible
                  ?.map(
                    (person) =>
                      `${person.display_name || 'Staff'}${person.is_active === false ? ' (disabled)' : ''}`,
                  )
                  .join(', ') || 'Not assigned'}
              </p>
              <div className="admin-actions">
                <button className="admin-button" onClick={() => setView('overview')}>
                  Overview
                </button>
                {form.can_manage && (
                  <button className="admin-button" onClick={() => setEditor(form)}>
                    Edit form & assignments
                  </button>
                )}
                {view !== 'responses' && (
                  <button className="admin-button" onClick={() => setView('responses')}>
                    View responses
                  </button>
                )}
                {view !== 'actions' && (
                  <button className="admin-button" onClick={() => setView('actions')}>
                    View actions
                  </button>
                )}
                <Link
                  className="admin-button"
                  to={`/forms/${form.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open public form
                </Link>
              </div>
              <p>
                {form.response_count} responses · {form.new_count} awaiting action ·{' '}
                {form.open_actions} open actions
              </p>
              {view === 'overview' && (
                <>
                  <p>{form.description}</p>
                  <h4>Where this form is used</h4>
                  {(state.data.pages || [])
                    .filter((page) => page.form_id === form.id)
                    .map((page) => (
                      <p key={page.id}>
                        <Link to={pageUrl(page)}>{page.title}</Link> · {page.placement} ·{' '}
                        {page.published ? 'Page live' : 'Page hidden'}
                      </p>
                    ))}
                  {!(state.data.pages || []).some((page) => page.form_id === form.id) && (
                    <p>
                      No linked page is visible to your account. Its direct form link can still be
                      used when published.
                    </p>
                  )}
                  <p>
                    Assignments control who receives new responses. Existing actions keep their
                    named assignee until reassigned.
                  </p>
                </>
              )}
            </section>
          )}
          {['responses', 'actions'].includes(view) ? (
            <FormResponses
              key={`${selected}:${view}`}
              formId={selected}
              actionsOnly={view === 'actions'}
            />
          ) : (
            !selected && (
              <>
                <label className="content-filter">
                  Show forms
                  <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                    <option value="all">All forms</option>
                    {['Live', 'Draft', 'Closed'].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <div className="content-card-grid">
                  {forms
                    .filter((item) => filter === 'all' || formStatus(item) === filter)
                    .map((item) => (
                      <article className="admin-panel" key={item.id}>
                        <h3>{item.title}</h3>
                        <span className="content-status">{formStatus(item)}</span>
                        <p>
                          Responsible:{' '}
                          {item.responsible
                            ?.map((person) => person.display_name || 'Staff')
                            .join(', ') || 'Not assigned'}
                        </p>
                        <p>
                          {item.response_count} responses · {item.open_actions} open actions
                        </p>
                        <button className="admin-button" onClick={() => open(item.id)}>
                          Manage form
                        </button>
                      </article>
                    ))}
                </div>
                {!forms.length && (
                  <p>No custom forms yet. Create one here or while setting up a poster page.</p>
                )}
              </>
            )
          )}
          {selected && !form && (
            <p>This form is not available to your account. Refresh or return to Current forms.</p>
          )}
        </>
      )}
    </section>
  );
}
