import React, { useEffect, useId, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { streamSettings, loadSceneTemplate } from '@/lib/streamWorkspace';

export default function StreamSettingsLibrary({
  value,
  onChange,
  templates = [],
  disabled,
  savedTemplate,
  loadBlocked = '',
}) {
  const fieldId = useId();
  const [selected, setSelected] = useState(savedTemplate?.id || '');
  const [message, setMessage] = useState('');
  const template = templates.find((item) => item.id === selected);
  useEffect(() => {
    setSelected(savedTemplate?.id || '');
  }, [savedTemplate?.id]);
  return (
    <section className="scene-template-library admin-panel" aria-label="Saved stream settings">
      <div className="admin-actions">
        <label>
          <span id={fieldId}>Saved settings</span>
          <select
            aria-labelledby={fieldId}
            value={selected}
            disabled={disabled || !templates.length}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">
              {templates.length ? 'Choose saved settings…' : 'No saved settings yet'}
            </option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-button"
          disabled={disabled || Boolean(loadBlocked) || !template}
          onClick={() => {
            if (disabled || loadBlocked || !template) return;
            setMessage('');
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
          <FolderOpen size={18} aria-hidden="true" /> Load settings
        </button>
      </div>
      {loadBlocked && <small>{loadBlocked}</small>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
