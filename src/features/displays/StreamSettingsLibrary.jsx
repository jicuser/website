import React, { useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import {
  streamSetupProblem,
  streamTemplateSettings,
} from '../../../supabase/functions/_shared/stream-template.js';
import { streamSettings, loadSceneTemplate } from '@/lib/streamWorkspace';

export default function StreamSettingsLibrary({
  screenId,
  value,
  onChange,
  templates = [],
  onRefresh,
  disabled,
}) {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const problem = streamSetupProblem(value);
  const template = templates.find((item) => item.id === selected);
  async function save(replace = false) {
    setBusy(true);
    setMessage('');
    try {
      await tvRequest(
        'save-template',
        screenId,
        {
          name: value.scenes[0].name.trim(),
          settings: streamTemplateSettings(value, screenId),
          ...(replace && template
            ? { templateId: template.id, expectedUpdatedAt: template.updated_at }
            : {}),
        },
        { staff: true },
      );
      await onRefresh();
      setMessage(
        'All stream settings saved, including scenes, input details, layouts and audio. Reconnect live devices when reusing them.',
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="scene-template-library admin-panel">
      <h3>Saved stream settings</h3>
      <p>
        Save all scenes and their input details together. The first scene’s name identifies these
        settings.
      </p>
      {problem && <p>{problem}</p>}
      <div className="admin-actions">
        <label>
          Choose saved settings
          <select
            value={selected}
            disabled={disabled || busy}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Select saved settings…</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.settings ? ` · ${item.settings.scenes.length} scenes` : ' · single scene'}
              </option>
            ))}
          </select>
        </label>
        <button
          className="admin-button"
          disabled={disabled || busy || !template}
          onClick={() => {
            if (
              value.scenes.some((scene) => scene.layers.some((layer) => layer.type !== 'empty')) &&
              !window.confirm(
                'Load saved settings? This replaces your draft content and stops local sharing.',
              )
            )
              return;
            try {
              onChange(
                template.settings
                  ? streamSettings(value, structuredClone(template.settings))
                  : loadSceneTemplate(value, template.scene),
              );
              setMessage('Saved settings loaded. Reconnect any camera or screen when ready.');
            } catch (error) {
              setMessage(error.message);
            }
          }}
        >
          Load settings
        </button>
        <>
          {!problem && (
            <button className="admin-button" disabled={disabled || busy} onClick={() => save()}>
              Save stream settings
            </button>
          )}
        </>
        {template && !problem && (
          <button
            className="admin-button"
            disabled={disabled || busy}
            onClick={() => {
              if (
                window.confirm(
                  `Replace saved settings “${template.name}” with all current stream settings?`,
                )
              )
                save(true);
            }}
          >
            Update saved settings
          </button>
        )}
        {template && (
          <button
            className="admin-button"
            disabled={disabled || busy}
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete saved settings “${template.name}”? Your current setup stays open.`,
                )
              )
                return;
              setBusy(true);
              try {
                await tvRequest(
                  'delete-template',
                  screenId,
                  { templateId: template.id },
                  { staff: true },
                );
                setSelected('');
                await onRefresh();
              } catch (error) {
                setMessage(error.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete saved settings
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
