import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Plus, Save, Trash2, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { TEAM_GROUPS, teamMemberDraft, teamMemberPayload } from '@/lib/teamMembers';
import ProfilePhotoInput from './ProfilePhotoInput';

export default function TeamEditor({ uploadImage }) {
  const { can } = useAuth();
  const id = useId();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(teamMemberDraft);
  const [baseline, setBaseline] = useState(teamMemberDraft);
  const [photoFile, setPhotoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const addButton = useRef(null);
  const editorHeading = useRef(null);
  const hadEditor = useRef(false);
  const nameInput = useRef(null);
  const groupInput = useRef(null);
  const dirty =
    editorOpen && (photoFile !== null || JSON.stringify(form) !== JSON.stringify(baseline));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error: problem } = await supabase
        .from('team_members')
        .select('*')
        .order('sort_order');
      if (problem) throw problem;
      setRows(data || []);
    } catch (problem) {
      setLoadError(problem.message || 'We couldn’t load the team. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (editorOpen && !hadEditor.current) {
      editorHeading.current?.scrollIntoView({ block: 'start' });
      editorHeading.current?.focus({ preventScroll: true });
      hadEditor.current = true;
    } else if (!editorOpen && hadEditor.current && !busy) {
      addButton.current?.focus();
      hadEditor.current = false;
    }
  }, [editorOpen, busy]);

  function openEditor(member) {
    const draft = teamMemberDraft(member);
    setForm(draft);
    setBaseline(draft);
    setEditing(member?.id || null);
    setPhotoFile(null);
    setMessage('');
    setError('');
    setEditorOpen(true);
  }
  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setPhotoFile(null);
    setForm(teamMemberDraft());
    setBaseline(teamMemberDraft());
  }

  const save = useCallback(async () => {
    if (saving.current || !editorOpen || !dirty) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = teamMemberPayload(form);
      if (photoFile) {
        payload.image_url = await uploadImage(photoFile, 'team');
        // Keep the uploaded URL if the profile write needs to be retried.
        setForm((current) => ({ ...current, image_url: payload.image_url }));
        setPhotoFile(null);
      }
      const query = editing
        ? supabase.from('team_members').update(payload).eq('id', editing)
        : supabase.from('team_members').insert(payload);
      const { error: problem } = await query;
      if (problem) throw problem;
      closeEditor();
      setMessage('Team member saved.');
      await load();
    } catch (problem) {
      setError(problem.message || 'We couldn’t save this profile. Please try again.');
      if (!form.name.trim()) nameInput.current?.focus();
      else if (!TEAM_GROUPS.some(({ value }) => value === form.member_group))
        groupInput.current?.focus();
      throw problem;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }, [editorOpen, dirty, form, photoFile, editing, uploadImage, load]);
  useRegisterAdminSave(save, dirty && !busy, 'Save team member');

  async function remove(member) {
    if (busy || !window.confirm(`Delete ${member.name} from the team?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: problem } = await supabase.from('team_members').delete().eq('id', member.id);
      if (problem) throw problem;
      setMessage('Team member deleted.');
      await load();
    } catch (problem) {
      setError(problem.message || 'We couldn’t delete this profile. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-team-editor">
      <h2>Meet the team</h2>
      {message && (
        <p className="admin-hint" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="admin-field-error" role="alert">
          {error}
        </p>
      )}
      {editorOpen ? (
        <form
          className="admin-panel admin-team-form"
          aria-labelledby={`${id}-title`}
          onSubmit={(event) => {
            event.preventDefault();
            save().catch(() => {});
          }}
        >
          <h3 ref={editorHeading} id={`${id}-title`} tabIndex={-1}>
            <span className="jic-prompt">{editing ? 'Edit team member' : 'Add team member'}</span>
          </h3>
          <fieldset disabled={busy}>
            <ProfilePhotoInput
              file={photoFile}
              imageUrl={form.image_url}
              disabled={busy}
              onSelect={setPhotoFile}
              onRemove={() => {
                setPhotoFile(null);
                setForm({ ...form, image_url: '' });
              }}
            />
            <label>
              <span className="jic-prompt">Name</span>
              <input
                ref={nameInput}
                required
                value={form.name}
                placeholder="Full name"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              <span className="jic-prompt">Title</span>
              <input
                value={form.role_title}
                placeholder="Role or title"
                onChange={(event) => setForm({ ...form, role_title: event.target.value })}
              />
            </label>
            <label>
              <span className="jic-prompt">Description</span>
              <textarea
                rows={3}
                value={form.bio}
                placeholder="A short introduction"
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </label>
            <label>
              <span className="jic-prompt">Team section</span>
              <select
                ref={groupInput}
                required
                value={form.member_group}
                onChange={(event) => setForm({ ...form, member_group: event.target.value })}
              >
                <option value="">Choose a section</option>
                {TEAM_GROUPS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary>Display settings</summary>
              <label>
                Display order
                <input
                  type="number"
                  step="1"
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
                />
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => setForm({ ...form, published: event.target.checked })}
                />
                Show on the website
              </label>
            </details>
            <div className="admin-actions">
              <button
                type="submit"
                disabled={!dirty}
                className="admin-button primary"
                aria-busy={busy}
              >
                <Save size={18} aria-hidden="true" />
                {busy ? 'Saving…' : 'Save team member'}
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  closeEditor();
                  setError('');
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          {loading && <p role="status">Loading team…</p>}
          {loadError && (
            <div role="alert">
              <p>{loadError}</p>
              <button className="admin-button" onClick={load}>
                Try again
              </button>
            </div>
          )}
          <div className="admin-team-grid">
            {rows.map((member) => (
              <article key={member.id} className="admin-panel admin-team-card">
                <div className="admin-profile-avatar">
                  {member.image_url ? (
                    <img src={member.image_url} alt={member.name} loading="lazy" />
                  ) : (
                    <User size={40} aria-hidden="true" />
                  )}
                </div>
                <h3>{member.name}</h3>
                {member.role_title && <p className="admin-team-role">{member.role_title}</p>}
                {member.bio && <p className="admin-team-bio">{member.bio}</p>}
                <p className="admin-team-group">
                  {TEAM_GROUPS.find(({ value }) => value === member.member_group)?.label ||
                    'No section selected'}
                  {!member.published && ' · Draft'}
                </p>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() => openEditor(member)}
                    aria-label={`Edit ${member.name}`}
                  >
                    Edit
                  </button>
                  {can('delete_content') && (
                    <button
                      className="admin-button"
                      disabled={busy}
                      onClick={() => remove(member)}
                      aria-label={`Delete ${member.name}`}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            ))}
            <button
              ref={addButton}
              type="button"
              disabled={busy}
              className="admin-team-add"
              onClick={() => openEditor()}
            >
              <span className="admin-profile-avatar">
                <Plus size={32} aria-hidden="true" />
              </span>
              <strong>Add team member</strong>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
