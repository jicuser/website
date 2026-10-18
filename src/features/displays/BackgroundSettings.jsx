import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import NormalSettings from './NormalSettings';
import TvDisplayLayoutEditor from './TvDisplayLayoutEditor';
import ScheduledScenes from './ScheduledScenes';
import TvBoardPicker from './TvBoardPicker';
import TvThemePicker from './TvThemePicker';
import TvDraftReview from './TvDraftReview';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import { tvPresetLabel, tvEditorSections, TV_PRESET_DESCRIPTIONS } from '@/lib/tvEditorLabels';
import {
  createTvSettingsDraft,
  hasTvSettingsChanges,
  tvSettingsDraftReducer,
} from '@/lib/tvSettingsDraft';
import '@/styles/tv-admin.css';

export default function BackgroundSettings({
  screenId,
  data,
  currentEvents,
  onRefresh,
  onSwitchScreen,
}) {
  const [draft, dispatch] = useReducer(tvSettingsDraftReducer, null, () =>
    createTvSettingsDraft(screenId, data),
  );
  const { form, revision, remoteChanged } = draft;
  const { saveCurrent } = useAdminSave();
  const dirty = hasTvSettingsChanges(draft);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState('save');
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const [preset, setPreset] = useState('standby');
  const [task, setTask] = useState('design');
  const update = (key, value) => {
    if (inFlight.current) return;
    setMessage('');
    dispatch({ type: 'edit', key, value });
  };
  const sections = tvEditorSections(screenId, form.preset_names);
  const presetName = tvPresetLabel(preset, form.preset_names);
  const savedSettings = useMemo(() => JSON.parse(draft.baseline), [draft.baseline]);

  useEffect(() => {
    if (screenId === 'shoe-area') setPreset('standby');
  }, [screenId]);

  useEffect(() => {
    dispatch({ type: 'sync', screenId, data });
  }, [screenId, data]);

  useEffect(() => {
    if (!dirty && !busy) return undefined;
    const protectDraft = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty, busy]);

  async function save() {
    if (inFlight.current || !dirty) return false;
    inFlight.current = true;
    setOperation('save');
    setBusy(true);
    setMessage('');
    try {
      const saved = await tvRequest(
        'save-background',
        screenId,
        { settings: form, expectedUpdatedAt: revision },
        { staff: true },
      );
      dispatch({ type: 'saved', screenId, data: saved });
      setMessage('Display settings saved.');
      // The save response is authoritative; a failed status refresh is not a failed save.
      try {
        await onRefresh();
      } catch {
        setMessage('Display settings saved. Current screen status could not be refreshed.');
      }
      return true;
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  useRegisterAdminSave(save, dirty, 'Save display settings');

  async function reload() {
    if (
      inFlight.current ||
      (dirty && !window.confirm('Discard your unsaved display changes and reload saved settings?'))
    )
      return;
    inFlight.current = true;
    setOperation('reload');
    setBusy(true);
    try {
      const next = await onRefresh();
      dispatch({ type: 'reload', screenId, data: next });
      setMessage('Saved display settings reloaded.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="stream-background-settings">
      <p className="tv-editor-save-status" role="status">
        {busy
          ? operation === 'reload'
            ? 'Reloading saved settings…'
            : 'Saving…'
          : dirty
            ? 'Unsaved changes'
            : 'All changes saved'}
      </p>
      {data.presentation && (
        <p>A presentation is active. These automatic layouts are used when it ends.</p>
      )}
      {remoteChanged && (
        <p className="stream-feedback" role="alert">
          Saved settings changed elsewhere. Your edits are kept here. Reload saved settings before
          editing again.
        </p>
      )}
      <fieldset className="tv-settings-fields" disabled={busy}>
        <legend className="sr-only">Automatic display settings</legend>
        <div className="tv-editor-context tv-display-choice">
          <label>
            Display to edit
            <select value={preset} onChange={(event) => setPreset(event.target.value)}>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="tv-display-description">{TV_PRESET_DESCRIPTIONS[preset]}</p>

        <div
          className="tv-task-tabs"
          role="tablist"
          aria-label="Display editing tasks"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
            const index = tabs.indexOf(document.activeElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            event.preventDefault();
            tabs[next].focus();
            tabs[next].click();
          }}
        >
          {[
            ['design', 'Design'],
            ['content', 'Content & timing'],
            ['advanced', 'Advanced'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tv-task-${screenId}-${id}`}
              aria-controls={`tv-panel-${screenId}-${id}`}
              aria-selected={task === id}
              tabIndex={task === id ? 0 : -1}
              onClick={() => setTask(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="tv-task-panel"
          id={`tv-panel-${screenId}-design`}
          role="tabpanel"
          aria-labelledby={`tv-task-${screenId}-design`}
          hidden={task !== 'design'}
        >
          <TvDisplayLayoutEditor
            screenId={screenId}
            disabled={busy}
            settings={form}
            preset={preset}
            onChange={update}
            allowBlocks={preset === 'standby'}
          />
          {preset === 'standby' && (
            <details className="tv-task-disclosure">
              <summary>Change layout</summary>
              <TvBoardPicker
                key={`${screenId}:${form.display_orientation}:${revision}`}
                screenId={screenId}
                settings={form}
                onChange={update}
                disabled={busy}
              />
            </details>
          )}
          <details className="tv-task-disclosure">
            <summary>Change colours</summary>
            <TvThemePicker settings={form} onChange={update} disabled={busy} />
          </details>
        </div>

        <div
          className="tv-task-panel"
          id={`tv-panel-${screenId}-content`}
          role="tabpanel"
          aria-labelledby={`tv-task-${screenId}-content`}
          hidden={task !== 'content'}
        >
          <NormalSettings
            form={form}
            update={update}
            currentEvents={currentEvents}
            hall={screenId !== 'shoe-area'}
            preset={preset}
          />
        </div>

        <div
          className="tv-task-panel"
          id={`tv-panel-${screenId}-advanced`}
          role="tabpanel"
          aria-labelledby={`tv-task-${screenId}-advanced`}
          hidden={task !== 'advanced'}
        >
          <div className="tv-editor-context">
            <label>
              Screen
              <select
                value={screenId}
                onChange={(event) => {
                  if (!dirty || window.confirm('Discard unsaved changes and switch screens?'))
                    onSwitchScreen?.(event.target.value);
                }}
              >
                {TV_SCREENS.map((screen) => (
                  <option key={screen.id} value={screen.id}>
                    {screen.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Screen shape
              <select
                value={form.display_orientation}
                onChange={(event) => update('display_orientation', event.target.value)}
              >
                <option value="landscape">Landscape · 16:9</option>
                <option value="portrait">Portrait · 9:16</option>
              </select>
            </label>
            <label>
              Display name
              <input
                maxLength={40}
                value={presetName}
                onChange={(event) =>
                  update('preset_names', {
                    ...form.preset_names,
                    [preset]: event.target.value,
                  })
                }
              />
            </label>
          </div>
          <ScheduledScenes form={form} update={update} screenId={screenId} disabled={busy} />
          <button
            type="button"
            className="admin-button tv-reload-settings"
            disabled={busy}
            onClick={reload}
          >
            {busy && operation === 'reload' ? 'Reloading…' : 'Reload saved settings'}
          </button>
        </div>
      </fieldset>

      {dirty && (
        <TvDraftReview
          key={screenId}
          saved={savedSettings}
          draft={form}
          screenId={screenId}
          preset={preset}
        />
      )}

      <div className="admin-actions tv-save-actions">
        <button
          className="admin-button primary"
          disabled={busy || !dirty}
          onClick={() => saveCurrent().catch(() => {})}
        >
          {busy && operation === 'save' ? 'Saving…' : 'Save display settings'}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
