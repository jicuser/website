import React, { useEffect, useId, useRef, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { nameProblem } from '../../../supabase/functions/_shared/tv-scenes.js';
import {
  streamSetupProblem,
  streamTemplateSettings,
} from '../../../supabase/functions/_shared/stream-template.js';

export default function StreamSaveDialog({
  screenId,
  settings,
  template,
  ended = false,
  onSaved,
  onDismiss,
  onEdit,
}) {
  const id = useId();
  const dialog = useRef(null);
  const nameField = useRef(null);
  const saving = useRef(false);
  const [name, setName] = useState(template?.name || '');
  const [replace, setReplace] = useState(Boolean(template));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const problem = streamSetupProblem(settings);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    nameField.current?.focus();
    return () => element.close();
  }, []);

  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    const invalid = nameProblem(name, 'stream name');
    setNameError(invalid);
    if (invalid) {
      nameField.current?.focus();
      return;
    }
    if (problem) {
      setError(problem);
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await tvRequest(
        'save-template',
        screenId,
        {
          name: name.trim(),
          settings: streamTemplateSettings(settings, screenId),
          ...(replace && template
            ? { templateId: template.id, expectedUpdatedAt: template.updated_at }
            : {}),
        },
        { staff: true },
      );
      onSaved(result.template);
    } catch (failure) {
      setError(failure.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="admin-panel admin-edit-dialog stream-save-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving.current) onDismiss();
      }}
    >
      <h3 id={`${id}-title`}>
        {ended ? 'Stream ended. Save its settings?' : 'Save stream settings'}
      </h3>
      {ended && <p>Connected screens are returning to the normal display.</p>}
      <p>Keep all scenes, input details, layouts and audio settings for next time.</p>
      <form onSubmit={save} noValidate>
        <label htmlFor={`${id}-name`}>Stream name (required)</label>
        <input
          id={`${id}-name`}
          ref={nameField}
          value={name}
          required
          maxLength={60}
          placeholder="e.g. Sunday Quran lesson"
          disabled={busy}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setNameError('');
          }}
        />
        {nameError && (
          <small id={`${id}-name-error`} className="admin-field-error" role="alert">
            {nameError}
          </small>
        )}
        {template && (
          <label className="admin-check">
            <input
              type="checkbox"
              checked={replace}
              disabled={busy}
              onChange={(event) => setReplace(event.target.checked)}
            />
            Update saved settings “{template.name}”
          </label>
        )}
        {problem && <p role="alert">{problem}</p>}
        {error && (
          <p className="admin-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-actions">
          <button className="admin-button" type="button" disabled={busy} onClick={onDismiss}>
            {ended ? 'Don’t save' : 'Cancel'}
          </button>
          {problem && onEdit && (
            <button className="admin-button" type="button" disabled={busy} onClick={onEdit}>
              Edit settings
            </button>
          )}
          <button
            className="admin-button primary"
            type="submit"
            disabled={busy || Boolean(problem)}
          >
            {busy ? 'Saving…' : 'Save stream settings'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
