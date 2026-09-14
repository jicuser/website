import React, { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked, dateLabel } from '@/components/workspace/shared';
import { workflowChanged } from '@/lib/pageContent';

export default function FormActions({ formId = null }) {
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [people, setPeople] = useState([]);
  const read = useCallback(signal => checked(supabase.rpc('admin_form_tasks', {p_form_id: formId, p_offset: page * 25}).abortSignal(signal)), [formId, page]);
  const {data, loading, error, reload} = useAdminRecords(read);
  async function run(work, changed = true) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await work(); if (changed) workflowChanged(); }
    catch (failure) { setMessage(failure.message || 'Could not save this action. Refresh and try again.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Form actions">
    <div className="admin-heading"><h3>Actions {data ? `· ${data.open_count} outstanding` : ''}</h3><button type="button" className="admin-button" disabled={loading || busy} onClick={reload}>Refresh actions</button></div>
    <p>Completing an action does not complete its response or accept an application.</p>
    {(error || message) && <p role="alert">{error || message}</p>}
    {loading && !data && <p role="status">Loading actions…</p>}
    {data?.rows?.length === 0 && <p>No actions here yet.</p>}
    {(data?.rows || []).map(task => <article className="admin-panel" key={task.id}>
      <h4>{task.title}</h4><p>{task.form_title || 'Form response'}</p>
      <p><strong>Responsible:</strong> {task.assignee_name || 'Staff member'} · Due: {dateLabel(task.due_at)}</p>
      {task.description && <p>{task.description}</p>}
      <div className="admin-actions">
        <label>Status<select aria-label={`Status for ${task.title}`} disabled={busy} value={task.status} onChange={event => {
          const status = event.target.value;
          void run(() => checked(supabase.from('work_tasks').update({status}).eq('id',task.id).eq('updated_at',task.updated_at).select('id').single()));
        }}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="done">Completed</option></select></label>
        {task.can_reassign && task.custom_form_id && <button type="button" className="admin-button" disabled={busy} onClick={() => run(async () => {
          const available = await checked(supabase.rpc('custom_form_assignees',{p_form_id:task.custom_form_id}));
          setPeople(available || []);setEditing(task);
        }, false)}>Reassign</button>}
      </div>
      {editing?.id === task.id && <form onSubmit={event => {
        event.preventDefault();const person = new FormData(event.currentTarget).get('person');
        void run(async () => {await checked(supabase.rpc('reassign_form_task',{p_task_id:editing.id,p_assigned_to:person,p_expected_updated_at:editing.updated_at}));setEditing(null);});
      }}>
        <label>Assign to<select name="person" required defaultValue={editing.assigned_to} disabled={busy}>{people.map(person => <option key={person.id} value={person.id}>{person.display_name || 'Staff member'}</option>)}</select></label>
        <div className="admin-actions"><button className="admin-button primary" disabled={busy}>Save assignment</button><button type="button" className="admin-button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
      </form>}
    </article>)}
    {data && data.total > 25 && <div className="admin-actions"><button className="admin-button" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>Previous actions</button><span>Page {page + 1} · {data.total} actions</span><button className="admin-button" disabled={loading || (page + 1) * 25 >= data.total} onClick={() => setPage(value => value + 1)}>Next actions</button></div>}
  </section>;
}
