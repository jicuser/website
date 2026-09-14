import React, { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { checked, dateLabel } from '@/components/workspace/shared';
import { formTitle, formAction, safeDownloadUrl } from '@/lib/customForms';
import { workflowChanged } from '@/lib/pageContent';
import useWorkflowData from './useWorkflowData';

export default function FormResponses({ formId = '', actionsOnly = false }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('new');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const load = useCallback(
    () =>
      checked(
        supabase.rpc('search_form_submissions', {
          p_kind: 'custom',
          p_form_id: formId || null,
          p_status: actionsOnly ? null : status || null,
          p_search: query,
          p_offset: page * 25,
          p_limit: 25,
        }),
      ),
    [formId, actionsOnly, status, query, page],
  );
  const state = useWorkflowData(load);
  return (
    <section className="admin-panel">
      <h3>{actionsOnly ? 'Response actions' : 'Responses'}</h3>
      <form
        className="admin-actions"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search);
          setPage(0);
        }}
      >
        <label>
          Search answers
          <input
            value={search}
            maxLength={200}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="admin-button">Search</button>
        {!actionsOnly && (
          <label>
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              <option value="new">Awaiting action</option>
              <option value="done">Completed</option>
              <option value="">All responses</option>
            </select>
          </label>
        )}
        <button className="admin-button" type="button" onClick={state.refresh}>
          Refresh
        </button>
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      {!state.data && !state.error ? (
        <p role="status">Loading responses…</p>
      ) : (
        <>
          <p>
            {state.data?.total || 0} matching responses · {state.data?.new_count || 0} awaiting
            action
          </p>
          {(state.data?.rows || []).map((row) => (
            <Response key={row.id} row={row} actionsOnly={actionsOnly} />
          ))}
          {!state.data?.rows?.length && <p>No responses match.</p>}
          <div className="admin-actions">
            <button
              className="admin-button"
              disabled={page === 0 || state.loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="admin-button"
              disabled={state.loading || (page + 1) * 25 >= (state.data?.total || 0)}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Response({ row, actionsOnly }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="admin-panel"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {formTitle(row)} · {row.payload.name || row.payload.attendee_name || 'Response'} ·{' '}
        {dateLabel(row.created_at)}
      </summary>
      {open && <ResponseDetails row={row} actionsOnly={actionsOnly} />}
    </details>
  );
}
function ResponseDetails({ row, actionsOnly }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [action, setAction] = useState('Follow up response'),
    [assigned, setAssigned] = useState('');
  const load = useCallback(
    async () => ({
      tasks: await checked(
        supabase
          .from('work_tasks')
          .select('id,title,status,assigned_to,due_at')
          .eq('form_id', row.id)
          .order('created_at')
          .limit(100),
      ),
      people: await checked(
        supabase.rpc('custom_form_assignees', { p_form_id: row.custom_form_id }),
      ),
      notes: await checked(
        supabase
          .from('form_replies')
          .select('id,body,internal,created_at')
          .eq('submission_id', row.id)
          .order('created_at')
          .limit(100),
      ),
      files: await checked(
        supabase
          .from('form_attachments')
          .select('id,field_id,file_name')
          .eq('submission_id', row.id),
      ),
    }),
    [row.id, row.custom_form_id],
  );
  const state = useWorkflowData(load);
  const run = async (work) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
      workflowChanged();
    } catch (failure) {
      setError(failure.message || 'The change was not saved.');
    } finally {
      setBusy(false);
    }
  };
  const labels = Object.fromEntries(
    (row.schema_snapshot?.schema?.fields || row.schema_snapshot?.fields || []).map((field) => [
      field.id,
      field.label,
    ]),
  );
  return (
    <div className="content-response">
      {error && <p role="alert">{error}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {!actionsOnly && (
        <>
          <dl>
            {Object.entries(row.payload).map(([key, value]) => (
              <div key={key}>
                <dt>{labels[key] || key.replaceAll('_', ' ')}</dt>
                <dd>
                  {typeof value === 'boolean'
                    ? value
                      ? 'Yes'
                      : 'No'
                    : Array.isArray(value)
                      ? value.join(', ')
                      : String(value ?? '')}
                </dd>
              </div>
            ))}
          </dl>
          {(state.data?.files || []).map((file) => (
            <button
              className="admin-button"
              key={file.id}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await formAction(supabase, {
                    action: 'download',
                    attachment_id: file.id,
                  });
                  const url = safeDownloadUrl(result.url);
                  if (!url) throw new Error('Download address could not be verified.');
                  window.location.assign(url);
                })
              }
            >
              Download {file.file_name}
            </button>
          ))}
          <button
            className="admin-button"
            disabled={busy}
            onClick={() =>
              run(() =>
                checked(
                  supabase.rpc('set_custom_form_status', {
                    p_submission_id: row.id,
                    p_status: row.status === 'new' ? 'done' : 'new',
                  }),
                ),
              )
            }
          >
            {row.status === 'new' ? 'Mark response completed' : 'Reopen response'}
          </button>
          <p>
            Completing a response does not accept an applicant or complete its separate actions.
          </p>
        </>
      )}
      <h4>Actions & responsibility</h4>
      {(state.data?.tasks || []).map((task) => (
        <div key={task.id} className="content-action">
          <strong>{task.title}</strong>
          <small>{task.due_at ? `Due ${dateLabel(task.due_at)}` : 'No due date'}</small>
          <label>
            Assigned to
            <select
              disabled={busy}
              value={task.assigned_to}
              onChange={(event) =>
                run(() =>
                  checked(
                    supabase.rpc('update_form_task', {
                      p_task_id: task.id,
                      p_status: task.status,
                      p_assigned_to: event.target.value,
                    }),
                  ),
                )
              }
            >
              {!(state.data.people || []).some((person) => person.id === task.assigned_to) && (
                <option value={task.assigned_to}>Previous assignee — reassign</option>
              )}
              {(state.data.people || []).map((person) => (
                <option value={person.id} key={person.id}>
                  {person.display_name || 'Staff'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action status
            <select
              disabled={busy}
              value={task.status}
              onChange={(event) =>
                run(() =>
                  checked(
                    supabase.rpc('update_form_task', {
                      p_task_id: task.id,
                      p_status: event.target.value,
                      p_assigned_to: task.assigned_to,
                    }),
                  ),
                )
              }
            >
              {[
                ['open', 'To do'],
                ['in_progress', 'In progress'],
                ['waiting', 'Waiting'],
                ['done', 'Completed'],
              ].map(([value, title]) => (
                <option key={value} value={value}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <form
        className="content-action"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await checked(
              supabase.rpc('assign_custom_form_task', {
                p_submission_id: row.id,
                p_assigned_to: assigned,
                p_title: action,
              }),
            );
            setAction('Follow up response');
          });
        }}
      >
        <label>
          New action
          <input
            required
            value={action}
            maxLength={160}
            onChange={(event) => setAction(event.target.value)}
          />
        </label>
        <label>
          Responsible person
          <select required value={assigned} onChange={(event) => setAssigned(event.target.value)}>
            <option value="">Choose…</option>
            {(state.data?.people || []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name || 'Staff'}
              </option>
            ))}
          </select>
        </label>
        <button className="admin-button" disabled={busy || !assigned}>
          Assign action
        </button>
      </form>
      {!actionsOnly && (
        <>
          <h4>Internal notes</h4>
          {(state.data?.notes || []).map((item) => (
            <p className="content-note" key={item.id}>
              {item.body}
              <small>
                {dateLabel(item.created_at)} · {item.internal ? 'Staff only' : 'Reply'}
              </small>
            </p>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await checked(
                  supabase.rpc('reply_custom_form', {
                    p_submission_id: row.id,
                    p_body: note,
                    p_internal: true,
                  }),
                );
                setNote('');
              });
            }}
          >
            <label>
              Staff-only note
              <textarea
                value={note}
                maxLength={6000}
                required
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button className="admin-button" disabled={busy || !note.trim()}>
              Add note
            </button>
          </form>
        </>
      )}
    </div>
  );
}
