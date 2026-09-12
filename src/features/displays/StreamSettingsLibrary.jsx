import React, { useState } from 'react';
import { streamSettings, loadSceneTemplate } from '@/lib/streamWorkspace';

export default function StreamSettingsLibrary({
  value,
  onChange,
  templates = [],
  disabled,
  savedTemplate,
}) {
  const [selected, setSelected] = useState(savedTemplate?.id || '');
  const [message, setMessage] = useState('');
  const template = templates.find((item) => item.id === selected);
  return (
    <details className="scene-template-library admin-panel">
      <summary>Use saved stream settings</summary>
      <p>Load a previous stream with its scenes and input details.</p>
      <div className="admin-actions">
        <label>
          Saved stream
          <select
            value={selected}
            disabled={disabled}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Choose saved settings…</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="admin-button"
          disabled={disabled || !template}
          onClick={() => {
            try {
              onChange(
                template.settings
                  ? streamSettings(value, structuredClone(template.settings))
                  : loadSceneTemplate(
                      { ...value, scenes: [value.scenes[0]], active_scene_id: value.scenes[0].id },
                      template.scene,
                    ),
                template,
              );
            } catch (error) {
              setMessage(error.message);
            }
          }}
        >
          Load settings
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
