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
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
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
    setRenaming(false);
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
      setMessage('Display settings saved. Layouts follow their automatic timings.');
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
      setRenaming(false);
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
            ? 'Unsaved changes — save to apply them to this screen.'
            : 'You are viewing saved display settings.'}
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
        <div className="tv-workflow-heading">
          <span aria-hidden="true">1</span>
          <div>
            <h3>Choose your screen</h3>
            <p>Each screen keeps its own design and settings.</p>
          </div>
        </div>
        <div className="tv-editor-context">
          <label>
            Screen to edit
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
        </div>

        <div className="tv-scene-tabs-wrap">
          <div className="tv-scene-tabs-head">
            <div className="tv-workflow-heading">
              <span aria-hidden="true">2</span>
              <div>
                <h3>Choose when it appears</h3>
                <p>Edit the everyday screen or one of its automatic prayer displays.</p>
              </div>
            </div>
            <button
              type="button"
              className="admin-text-button"
              aria-expanded={renaming}
              onClick={() => {
                setRenameValue(presetName);
                setRenaming((value) => !value);
              }}
            >
              {renaming ? 'Done renaming' : 'Rename section'}
            </button>
          </div>
          <div className="tv-section-choices" role="group" aria-label="Display sections">
            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                aria-pressed={preset === section.id}
                onClick={() => {
                  setPreset(section.id);
                  setRenaming(false);
                }}
              >
                <span className={`tv-section-icon is-${section.id}`} aria-hidden="true" />
                {section.name}
              </button>
            ))}
          </div>
          <p className="tv-layout-help">
            {TV_PRESET_DESCRIPTIONS[preset]} Selecting a section changes this editor’s preview.
          </p>
          {renaming && (
            <label className="tv-scene-rename">
              Section name
              <input
                maxLength={40}
                value={renameValue}
                onChange={(event) => {
                  setRenameValue(event.target.value);
                  update('preset_names', { ...form.preset_names, [preset]: event.target.value });
                }}
              />
            </label>
          )}
        </div>

        <div className="tv-workflow-heading">
          <span aria-hidden="true">3</span>
          <div>
            <h3>Design your display</h3>
            <p>Choose a starting design, then adjust its colours and individual items.</p>
          </div>
        </div>

        {preset === 'standby' && (
          <TvBoardPicker
            key={`${screenId}:${form.display_orientation}:${revision}`}
            screenId={screenId}
            settings={form}
            onChange={update}
            disabled={busy}
          />
        )}

        <TvThemePicker settings={form} onChange={update} disabled={busy} />

        <TvDisplayLayoutEditor
          screenId={screenId}
          disabled={busy}
          settings={form}
          preset={preset}
          onChange={update}
          allowBlocks={preset === 'standby'}
        />
        <NormalSettings
          form={form}
          update={update}
          currentEvents={currentEvents}
          hall={screenId !== 'shoe-area'}
          preset={preset}
        />
        <ScheduledScenes form={form} update={update} screenId={screenId} disabled={busy} />
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
        <button className="admin-button" disabled={busy} onClick={reload}>
          {busy && operation === 'reload' ? 'Reloading…' : 'Reload saved settings'}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
