import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { formAction, formTitle, safeDownloadUrl } from '@/lib/customForms';
import { collectPages, downloadBlob, submissionsCsv } from '@/lib/formDownloads';
import { checked, dateLabel, Field } from './shared';
import FeeLedger from './FeeLedger';
import CustomFormsEmail from './CustomFormsEmail';

export default function CustomFormsInbox({ auth, definitions, assignments, initialMine = false }) {
  const [filters, setFilters] = useState({
    search: '',
    kind: '',
    form: '',
    status: 'new',
    from: '',
    to: '',
    oldest: false,
    mine: initialMine,
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ rows: [], total: 0, new_count: 0, done_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState([]);
  const [exportStatus, setExportStatus] = useState('');
  const exportController = useRef(null);
  const patch = (value) => {
    setFilters((current) => ({ ...current, ...value }));
    setPage(0);
    setSelected([]);
  };
  useEffect(() => {
    if (search === filters.search) return undefined;
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search }));
      setPage(0);
      setSelected([]);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, filters.search]);
  useEffect(() => () => exportController.current?.abort(), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    checked(supabase.rpc('search_form_submissions', queryArgs(filters, page * 25, 25)))
      .then((data) => {
        if (active) setResult(data || { rows: [], total: 0, new_count: 0, done_count: 0 });
      })
      .catch(() => {
        if (active) {
          setResult({ rows: [], total: 0, new_count: 0, done_count: 0 });
          setError('Responses could not be loaded. Please refresh or contact an administrator.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, page, revision]);

  async function exportCsv() {
    const controller = new AbortController();
    exportController.current = controller;
    setExportStatus('Preparing export…');
    setError('');
    try {
      const snapshot = { ...filters, before: new Date().toISOString() };
      const rows = await collectPages(
        async (offset, limit) => {
          const data = await checked(
            supabase.rpc('search_form_submissions', queryArgs(snapshot, offset, limit)),
          );
          return data?.rows || [];
        },
        {
          signal: controller.signal,
          onProgress: (count) => setExportStatus(`Collected ${count.toLocaleString()} responses…`),
        },
      );
      downloadBlob(
        new Blob(
          ['\ufeff' + submissionsCsv(rows.map((row) => ({ ...row, form_title: formTitle(row) })))],
          { type: 'text/csv;charset=utf-8' },
        ),
        'form-responses.csv',
      );
      setExportStatus('');
    } catch (failure) {
      setExportStatus('');
      if (failure.name !== 'AbortError') setError(failure.message);
    } finally {
      if (exportController.current === controller) exportController.current = null;
    }
  }

  async function exportZip() {
    const rows = result.rows.filter((row) => selected.includes(row.id));
    if (
      !rows.length ||
      rows.some((row) => row.kind !== 'custom') ||
      new Set(rows.map((row) => row.custom_form_id)).size !== 1
    ) {
      setError('Select responses from one custom form to download their attachments together.');
      return;
    }
    setExportStatus('Preparing attachments…');
    setError('');
    try {
      const blob = await formAction(supabase, {
        action: 'export',
        form_id: rows[0].custom_form_id,
        format: 'zip',
        submission_ids: rows.map((row) => row.id),
      });
      if (!(blob instanceof Blob))
        throw new Error('The attachment download could not be prepared.');
      downloadBlob(blob, 'form-attachments.zip');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setExportStatus('');
    }
  }
  return (
    <section>
      <div className="workspace-header">
        <h2>Responses</h2>
        <button disabled={loading} onClick={() => setRevision((value) => value + 1)}>
          Refresh responses
        </button>
      </div>
      <div className="custom-forms-toolbar">
        <Field label="Search all answers">
          <input
            type="search"
            value={search}
            maxLength={200}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Form">
          <select
            value={filters.form || filters.kind}
            onChange={(event) =>
              patch(
                event.target.value.startsWith('form:')
                  ? { form: event.target.value, kind: 'custom' }
                  : { kind: event.target.value, form: '' },
              )
            }
          >
            <option value="">All permitted forms</option>
            <option value="contact">Contact</option>
            <option value="madrassah">Madrassah</option>
            <option value="itikaaf">I’tikaf</option>
            <option value="custom">All custom forms</option>
            {definitions.map((form) => (
              <option key={form.id} value={`form:${form.id}`}>
                {form.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={filters.status}
            onChange={(event) => patch({ status: event.target.value })}
          >
            <option value="new">Outstanding</option>
            <option value="done">Completed</option>
            <option value="">All statuses</option>
          </select>
        </Field>
        <Field label="View">
          <select
            value={filters.mine ? 'mine' : 'all'}
            onChange={(event) => patch({ mine: event.target.value === 'mine' })}
          >
            <option value="all">All my permitted responses</option>
            <option value="mine">Responses I submitted</option>
          </select>
        </Field>
      </div>
      <div className="custom-forms-toolbar">
        <Field label="From date">
          <input
            type="date"
            value={filters.from}
            onChange={(event) => patch({ from: event.target.value })}
          />
        </Field>
        <Field label="To date">
          <input
            type="date"
            value={filters.to}
            onChange={(event) => patch({ to: event.target.value })}
          />
        </Field>
        <Field label="Sort">
          <select
            value={filters.oldest ? 'oldest' : 'newest'}
            onChange={(event) => patch({ oldest: event.target.value === 'oldest' })}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </Field>
      </div>
      <div className="custom-forms-counts">
        <span>
          <strong>{result.total}</strong> matching responses
        </span>
        <span>
          <strong>{result.new_count}</strong> outstanding
        </span>
        <span>
          <strong>{result.done_count}</strong> completed
        </span>
      </div>
      <div className="workspace-actions">
        <button disabled={loading || Boolean(exportStatus) || !result.total} onClick={exportCsv}>
          Download all matching responses as CSV
        </button>
        <button disabled={loading || Boolean(exportStatus) || !selected.length} onClick={exportZip}>
          Download selected attachments as ZIP
        </button>
        {exportStatus && exportController.current && (
          <button onClick={() => exportController.current?.abort()}>Cancel export</button>
        )}
      </div>
      {exportStatus && <p role="status">{exportStatus}</p>}
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading responses…</p>
      ) : !result.rows.length ? (
        <p>No responses match these filters.</p>
      ) : (
        result.rows.map((row) => {
          const canWork =
            row.kind === 'custom'
              ? auth.isOwner ||
                auth.can('forms_manage') ||
                auth.can('forms_custom') ||
                assignments.some(
                  (member) =>
                    member.form_id === row.custom_form_id && member.user_id === auth.user.id,
                )
              : auth.can(`forms_${row.kind}`);
          return (
            <Response
              key={`${row.id}-${revision}`}
              row={row}
              auth={auth}
              canWork={canWork}
              selected={selected.includes(row.id)}
              onSelect={(value) =>
                setSelected((current) =>
                  value ? [...current, row.id] : current.filter((id) => id !== row.id),
                )
              }
              onChanged={() => setRevision((value) => value + 1)}
            />
          );
        })
      )}
      <div className="workspace-actions">
        <button
          disabled={loading || page === 0}
          onClick={() => {
            setPage((value) => value - 1);
            setSelected([]);
          }}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          disabled={loading || (page + 1) * 25 >= result.total}
          onClick={() => {
            setPage((value) => value + 1);
            setSelected([]);
          }}
        >
          Next
        </button>
      </div>
      <p className="workspace-meta">
        Counts use your form, date, search and ownership filters. CSV includes every matching
        status-filtered response, up to 25,000 per export. ZIP accepts selected responses from one
        form, up to 25 MB.
      </p>
    </section>
  );
}

function queryArgs(filters, offset, limit) {
  const end = filters.to ? new Date(`${filters.to}T00:00:00`) : null;
  if (end) end.setDate(end.getDate() + 1);
  const before = filters.before ? new Date(filters.before) : null;
  return {
    p_search: filters.search,
    p_kind: filters.kind || null,
    p_form_id: filters.form ? filters.form.replace(/^form:/, '') : null,
    p_status: filters.status || null,
    p_from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null,
    p_to: end && (!before || end < before) ? end.toISOString() : before?.toISOString() || null,
    p_offset: offset,
    p_limit: limit,
    p_oldest: filters.oldest,
    p_mine: filters.mine,
  };
}

function Response({ row, auth, canWork, selected, onSelect, onChanged }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState([]);
  const [files, setFiles] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [threadRevision, setThreadRevision] = useState(0);
  useEffect(() => {
    if (!open || row.kind !== 'custom') return undefined;
    let active = true;
    setLoading(true);
    setMessage('');
    Promise.all([
      checked(
        supabase
          .from('form_replies')
          .select('*')
          .eq('submission_id', row.id)
          .order('created_at', { ascending: true })
          .limit(250),
      ),
      checked(
        supabase
          .from('form_attachments')
          .select('*')
          .eq('submission_id', row.id)
          .order('created_at', { ascending: true })
          .limit(5),
      ),
      canWork
        ? checked(supabase.rpc('custom_form_assignees', { p_form_id: row.custom_form_id }))
        : [],
    ])
      .then(([messages, attachments, members]) => {
        if (active) {
          setReplies(messages || []);
          setFiles(attachments || []);
          setPeople(members || []);
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            'Replies and attachments could not be loaded. Close this response and try again.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, row.id, row.kind, row.custom_form_id, canWork, threadRevision]);
  async function run(action) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error.message || 'The change could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  const fields = row.schema_snapshot?.fields || row.schema_snapshot?.schema?.fields || [];
  const labels = Object.fromEntries(fields.map((field) => [field.id, field.label]));
  const uploadFields = new Set(
    fields.filter((field) => ['image', 'file'].includes(field.type)).map((field) => field.id),
  );
  const email = Object.entries(row.payload || {}).find(
    ([key, value]) =>
      typeof value === 'string' &&
      (fields.some((field) => field.id === key && field.type === 'email') || /email$/.test(key)) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  )?.[1];
  return (
    <article className="workspace-card custom-response">
      {canWork && row.kind === 'custom' && (
        <label className="workspace-meta">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
          />{' '}
          Select for attachment download
        </label>
      )}
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>
          {formTitle(row)} · {row.payload?.name || row.payload?.attendee_name || 'Response'}
          <span className="workspace-meta">
            {' '}
            · {dateLabel(row.created_at)} · {row.status === 'done' ? 'Completed' : 'Outstanding'}
          </span>
        </summary>
        <dl>
          {Object.entries(row.payload || {})
            .filter(([key, value]) => value !== '' && !uploadFields.has(key))
            .map(([key, value]) => (
              <div key={key}>
                <dt>{labels[key] || key.replaceAll('_', ' ')}</dt>
                <dd>
                  {Array.isArray(value)
                    ? value.join(', ')
                    : typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : String(value ?? '')}
                </dd>
              </div>
            ))}
        </dl>
        <p className="workspace-meta">
          Reference: {row.id}
          {row.form_version ? ` · Form version ${row.form_version}` : ''}
        </p>
        {open && <FeeLedger key={row.id} formId={row.id} canManage={canWork} />}
        {canWork && (
          <div className="workspace-actions">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (row.kind === 'custom')
                    await checked(
                      supabase.rpc('set_custom_form_status', {
                        p_submission_id: row.id,
                        p_status: row.status === 'new' ? 'done' : 'new',
                      }),
                    );
                  else
                    await checked(
                      supabase
                        .from('form_submissions')
                        .update({ status: row.status === 'new' ? 'done' : 'new' })
                        .eq('id', row.id)
                        .select('id')
                        .single(),
                    );
                  onChanged();
                })
              }
            >
              {row.status === 'new' ? 'Mark completed' : 'Reopen'}
            </button>
            {row.kind === 'custom' ? (
              <button disabled={busy} onClick={() => setShowTask(!showTask)}>
                Assign action
              </button>
            ) : (
              <Link className="workspace-button" to={`/portal?form=${encodeURIComponent(row.id)}`}>
                Assign action
              </Link>
            )}
            {email && (
              <a
                className="workspace-button"
                href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${formTitle(row)}`)}`}
              >
                Open email draft
              </a>
            )}
          </div>
        )}
        {showTask && (
          <form
            className="workspace-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              run(async () => {
                await checked(
                  supabase.rpc('assign_custom_form_task', {
                    p_submission_id: row.id,
                    p_assigned_to: data.get('assignee'),
                    p_title: data.get('title'),
                    p_due_at: data.get('due') ? new Date(data.get('due')).toISOString() : null,
                  }),
                );
                setShowTask(false);
                setMessage('Action assigned.');
              });
            }}
          >
            <fieldset disabled={busy || loading}>
              <Field label="Action">
                <input
                  name="title"
                  required
                  maxLength={160}
                  list="response-action-list"
                  defaultValue="Call back"
                />
              </Field>
              <datalist id="response-action-list">
                {[
                  'Call back',
                  'Chase payment',
                  'Confirm payment',
                  'Request a photograph',
                  'Reply to enquiry',
                ].map((title) => (
                  <option key={title}>{title}</option>
                ))}
              </datalist>
              <Field label="Responsible person">
                <select name="assignee" required>
                  <option value="">Choose…</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Due (your local time)">
                <input name="due" type="datetime-local" />
              </Field>
              <button>Assign action</button>
            </fieldset>
          </form>
        )}
        {row.kind === 'custom' && (
          <>
            {loading && <p role="status">Loading replies and attachments…</p>}
            {files.length > 0 && (
              <div>
                <h3>Attachments</h3>
                {files.map((file) => (
                  <p key={file.id}>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const result = await formAction(supabase, {
                            action: 'download',
                            attachment_id: file.id,
                          });
                          const url = safeDownloadUrl(result?.url);
                          if (!url) throw new Error('A safe download link could not be created.');
                          const anchor = document.createElement('a');
                          anchor.href = url;
                          anchor.rel = 'noopener noreferrer';
                          anchor.target = '_blank';
                          anchor.download = file.file_name;
                          anchor.click();
                        })
                      }
                    >
                      Download {file.file_name}
                    </button>{' '}
                    <span className="workspace-meta">{Math.ceil(file.size_bytes / 1024)} KB</span>
                  </p>
                ))}
              </div>
            )}
            <h3>Replies and notes</h3>
            <div className="custom-response-thread">
              {replies.length === 0 && !loading && <p>No replies yet.</p>}
              {replies.map((item) => (
                <article
                  className="custom-response-message"
                  data-internal={item.internal}
                  key={item.id}
                >
                  <span className="workspace-meta">
                    {item.author_kind === 'email'
                      ? 'Email reply (sender not verified)'
                      : item.author_id === auth.user.id
                        ? 'You'
                        : 'Reply'}{' '}
                    · {item.internal ? 'Staff note · ' : ''}
                    {dateLabel(item.created_at)}
                  </span>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
            {replies.length >= 250 && (
              <p className="workspace-meta">Showing the first 250 messages in this conversation.</p>
            )}
            <form
              className="workspace-form"
              onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  await checked(
                    supabase.rpc('reply_custom_form', {
                      p_submission_id: row.id,
                      p_body: reply.trim(),
                      p_internal: canWork && internal,
                    }),
                  );
                  setReply('');
                  setThreadRevision((value) => value + 1);
                  setMessage('Reply saved.');
                });
              }}
            >
              <fieldset disabled={busy || loading}>
                <Field label={internal ? 'Internal note' : 'Reply in the portal'}>
                  <textarea
                    required
                    rows={3}
                    maxLength={6000}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                </Field>
                {canWork && (
                  <label>
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(event) => setInternal(event.target.checked)}
                    />{' '}
                    Staff-only note
                  </label>
                )}
                <button disabled={!reply.trim()}>
                  {busy ? 'Saving…' : internal ? 'Save staff note' : 'Send portal reply'}
                </button>
              </fieldset>
            </form>
            {open && canWork && (
              <CustomFormsEmail
                submissionId={row.id}
                recipient={email || ''}
                subject={`Re: ${formTitle(row)}`}
                onReply={() => setThreadRevision((value) => value + 1)}
              />
            )}
            {canWork && !row.submitter_id && (
              <p className="workspace-meta">
                This response was submitted without an account. Use the provided contact details to
                reply; portal messages are retained for your team.
              </p>
            )}
          </>
        )}
        {message && <p role="status">{message}</p>}
      </details>
    </article>
  );
}
