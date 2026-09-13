import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ActionForm, TextField, Field, Select, checked, dateLabel } from './shared';

export default function Tasks({ rows, notifications, reload, formId, onError }) {
  const [people, setPeople] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [filter, setFilter] = useState('active');
  useEffect(() => {
    let active = true;
    setPeople([]);
    setAssignee('');
    checked(supabase.rpc('task_assignees', { p_form_id: formId || null }))
      .then((data) => {
        if (active) setPeople(data || []);
      })
      .catch((error) => {
        if (active) onError(error.message);
      });
    return () => {
      active = false;
    };
  }, [formId, onError]);
  const shown = rows.filter(
    (row) =>
      filter === 'all' || (filter === 'done' ? row.status === 'done' : row.status !== 'done'),
  );
  const update = async (row, status) => {
    try {
      await checked(
        supabase.from('work_tasks').update({ status }).eq('id', row.id).select('id').single(),
      );
      await reload();
    } catch (error) {
      onError(error.message);
    }
  };
  return (
    <>
      <div className="workspace-grid">
        <div className="workspace-card">
          <h3>{rows.filter((r) => r.status !== 'done').length} open actions</h3>
        </div>
        <div className="workspace-card">
          <h3>
            {
              rows.filter(
                (r) => r.status !== 'done' && r.due_at && Date.parse(r.due_at) < Date.now(),
              ).length
            }{' '}
            overdue
          </h3>
        </div>
        <div className="workspace-card">
          <h3>{notifications.filter((r) => !r.read_at).length} unread alerts</h3>
        </div>
      </div>
      <ActionForm
        title={formId ? 'Assign an action for this form' : 'Create an action'}
        button="Assign action"
        onSubmit={async (form) => {
          await checked(
            supabase.rpc('create_work_task', {
              p_title: form.get('title'),
              p_description: form.get('description'),
              p_assigned_to: assignee,
              p_form_id: formId || null,
              p_due_at: form.get('due') ? new Date(form.get('due')).toISOString() : null,
            }),
          );
          await reload();
        }}
      >
        <TextField name="title" label="Action" list="action-examples" />
        <datalist id="action-examples">
          {[
            'Call back',
            'Request a photograph',
            'Chase payment',
            'Confirm payment',
            'Reply to enquiry',
          ].map((text) => (
            <option key={text}>{text}</option>
          ))}
        </datalist>
        <Select
          label="Responsible person"
          options={people}
          value={assignee}
          onChange={setAssignee}
        />
        <TextField
          name="due"
          label="Due (your local time)"
          type="datetime-local"
          required={false}
        />
        <Field label="Notes">
          <textarea name="description" maxLength={5000} rows={3} />
        </Field>
      </ActionForm>
      <Field label="Show actions">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="active">Outstanding</option>
          <option value="done">Completed</option>
          <option value="all">All</option>
        </select>
      </Field>
      {shown.length === 0 && <p>No actions here.</p>}
      {shown.map((row) => (
        <article className="workspace-card" key={row.id}>
          <h3>{row.title}</h3>
          <p>{row.description}</p>
          <p className="workspace-meta">
            Due: {dateLabel(row.due_at)}
            {row.form_id ? ' · Linked to form' : ''}
          </p>
          <Field label="Status">
            <select value={row.status} onChange={(e) => update(row, e.target.value)}>
              {['open', 'in_progress', 'waiting', 'done'].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
        </article>
      ))}
    </>
  );
}
export function Notifications({ rows, reload, onError, onOpen }) {
  return (
    <>
      {rows.length === 0 && <p>No notifications yet.</p>}
      {rows.map((row) => (
        <article className="workspace-card" key={row.id}>
          <h3>
            {{
              task: 'Action update',
              learning: 'Learning update',
              form: 'Form update',
              fee: 'Fee update',
            }[row.kind] || 'Account update'}
          </h3>
          <p>{dateLabel(row.created_at)}</p>
          {onOpen && (
            <button
              onClick={() =>
                onOpen(
                  { task: 'tasks', learning: 'learning', form: 'forms', fee: 'fees' }[row.kind] ||
                    'notifications',
                )
              }
            >
              Open update
            </button>
          )}
          {!row.read_at && (
            <button
              onClick={async () => {
                try {
                  await checked(
                    supabase
                      .from('user_notifications')
                      .update({ read_at: new Date().toISOString() })
                      .eq('id', row.id)
                      .select('id')
                      .single(),
                  );
                  await reload();
                } catch (error) {
                  onError(error.message);
                }
              }}
            >
              Mark read
            </button>
          )}
        </article>
      ))}
      <p className="workspace-meta">Reading an alert does not complete its action.</p>
    </>
  );
}
