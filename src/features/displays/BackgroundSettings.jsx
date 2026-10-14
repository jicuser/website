import React, { useEffect, useReducer, useRef, useState } from 'react';
import NormalSettings from './NormalSettings';
import TvDisplayLayoutEditor from './TvDisplayLayoutEditor';
import ScheduledScenes from './ScheduledScenes';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import { TV_PRESET_KEYS } from '../../../supabase/functions/_shared/tv.js';
import { tvPresetLabel, TV_PRESET_DESCRIPTIONS } from '@/lib/tvEditorLabels';
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
  const presetKeys = screenId === 'shoe-area' ? ['standby'] : TV_PRESET_KEYS;
  const presetName = tvPresetLabel(preset, form.preset_names);

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
            <label className="tv-preset-selector">
              Layout to edit
              <select
                value={preset}
                onChange={(event) => {
                  setPreset(event.target.value);
                  setRenaming(false);
                }}
              >
                {presetKeys.map((key) => (
                  <option key={key} value={key}>
                    {tvPresetLabel(key, form.preset_names)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="admin-text-button"
              aria-expanded={renaming}
              onClick={() => {
                setRenameValue(presetName);
                setRenaming((value) => !value);
              }}
            >
              {renaming ? 'Done renaming' : 'Rename layout'}
            </button>
          </div>
          <p>{TV_PRESET_DESCRIPTIONS[preset]} Selecting a layout only changes this editor.</p>
          {renaming && (
            <label className="tv-scene-rename">
              Layout name
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
