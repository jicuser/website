import React, { useEffect, useState } from 'react';
import NormalSettings from './NormalSettings';
import TvDisplayLayoutEditor from './TvDisplayLayoutEditor';
import ScheduledScenes from './ScheduledScenes';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { TV_PRESET_KEYS } from '../../../supabase/functions/_shared/tv.js';
import '@/styles/tv-admin.css';

export default function BackgroundSettings({
  screenId,
  data,
  currentEvents,
  onRefresh,
  onSwitchScreen,
}) {
  const [form, setForm] = useState(() => ({ ...data.settings, scene_mode: 'normal' }));
  const [revision, setRevision] = useState(data.updated_at);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preset, setPreset] = useState('standby');
  const [renaming, setRenaming] = useState(false);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const presetKeys = screenId === 'shoe-area' ? ['standby'] : TV_PRESET_KEYS;
  const presetName = form.preset_names?.[preset] || preset;
  useEffect(() => {
    setForm({ ...data.settings, scene_mode: 'normal' });
    setRevision(data.updated_at);
    setPreset('standby');
    setRenaming(false);
    setMessage('');
  }, [screenId, data.updated_at]);

  return (
    <div className="stream-background-settings">
      <div className="tv-editor-context">
        <label>
          Screen
          <select
            value={screenId}
            onChange={(event) => onSwitchScreen?.(event.target.value)}
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
            value={form.display_orientation || 'landscape'}
            onChange={(event) => update('display_orientation', event.target.value)}
          >
            <option value="landscape">Landscape · 16:9</option>
            <option value="portrait">Portrait · 9:16</option>
          </select>
        </label>
      </div>

      <div className="tv-scene-tabs-wrap">
        <div className="tv-scene-tabs-head">
          <span>Scene</span>
          <button type="button" className="admin-text-button" onClick={() => setRenaming((value) => !value)}>
            {renaming ? 'Done' : 'Rename'}
          </button>
        </div>
        <nav className="tv-preset-tabs" aria-label="TV scenes">
          {presetKeys.map((key) => (
            <button
              type="button"
              key={key}
              className="admin-button"
              aria-pressed={preset === key}
              onClick={() => setPreset(key)}
            >
              {form.preset_names?.[key] || key}
            </button>
          ))}
        </nav>
        {renaming && (
          <label className="tv-scene-rename">
            Scene name
            <input
              maxLength={40}
              value={presetName}
              onChange={(event) =>
                update('preset_names', {
                  ...(form.preset_names || {}),
                  [preset]: event.target.value,
                })
              }
            />
          </label>
        )}
      </div>

      <TvDisplayLayoutEditor
        screenId={screenId}
        settings={form}
        preset={preset}
        onChange={update}
      />

      <NormalSettings
        form={form}
        update={update}
        currentEvents={currentEvents}
        hall={screenId !== 'shoe-area'}
        preset={preset}
      />

      <ScheduledScenes form={form} update={update} screenId={screenId} />

      <div className="admin-actions tv-save-actions">
        <button
          className="admin-button primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage('');
            try {
              const saved = await tvRequest(
                'save-background',
                screenId,
                { settings: form, expectedUpdatedAt: revision },
                { staff: true },
              );
              setRevision(saved.updated_at);
              const next = await onRefresh();
              if (next?.settings) setForm({ ...next.settings, scene_mode: 'normal' });
              setMessage('TV display settings saved.');
            } catch (error) {
              setMessage(error.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Saving…' : 'Save TV settings'}
        </button>
        <button
          className="admin-button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm('Reload the saved TV settings and discard unpublished changes?'))
              return;
            setBusy(true);
            try {
              const next = await onRefresh();
              setForm({ ...next.settings, scene_mode: 'normal' });
              setRevision(next.updated_at);
              setMessage('Saved TV settings reloaded.');
            } catch (error) {
              setMessage(error.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Reload saved settings
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
