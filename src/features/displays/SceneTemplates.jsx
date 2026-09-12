import React, { useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { loadSceneTemplate } from '@/lib/streamWorkspace';

export default function SceneTemplates({
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
  const current = value.scenes.find((scene) => scene.id === value.active_scene_id);
  const template = templates.find((item) => item.id === selected);
  async function save(replace = false) {
    setBusy(true);
    setMessage('');
    try {
      await tvRequest(
        'save-template',
        screenId,
        {
          name: current.name.trim() || 'Saved scene',
          scene: current,
          ...(replace && template
            ? { templateId: template.id, expectedUpdatedAt: template.updated_at }
            : {}),
        },
        { staff: true },
      );
      await onRefresh();
      setMessage('Scene saved for your next setup. Live device connections are not stored.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="scene-template-library admin-panel">
      <summary>Saved scenes</summary>
      <p>Save the selected scene, or load one into this setup.</p>
      <div className="admin-actions">
        <label>
          Choose a saved scene
          <select
            value={selected}
            disabled={disabled || busy}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Select a scene…</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="admin-button"
          disabled={disabled || busy || !template}
          onClick={() => {
            if (
              current.layers.some((layer) => layer.type !== 'empty') &&
              !window.confirm('Replace this scene’s content with the saved scene?')
            )
              return;
            try {
              onChange(loadSceneTemplate(value, template.scene));
              setMessage('Saved scene loaded. Reconnect any camera or screen when ready.');
            } catch (error) {
              setMessage(error.message);
            }
          }}
        >
          Load scene
        </button>
        <button className="admin-button" disabled={disabled || busy} onClick={() => save()}>
          Save current scene
        </button>
        {template && (
          <button
            className="admin-button"
            disabled={disabled || busy}
            onClick={() => {
              if (window.confirm(`Replace saved scene “${template.name}” with the current scene?`))
                save(true);
            }}
          >
            Replace saved scene
          </button>
        )}
        {template && (
          <button
            className="admin-button"
            disabled={disabled || busy}
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete saved scene “${template.name}”? Your current setup stays open.`,
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
            Delete saved scene
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
