import React, { useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { streamSetupProblem } from '../../../supabase/functions/_shared/stream-template.js';
import StreamSaveDialog from './StreamSaveDialog';
import { streamSettings, loadSceneTemplate } from '@/lib/streamWorkspace';

export default function StreamSettingsLibrary({
  screenId,
  value,
  onChange,
  templates = [],
  onRefresh,
  disabled,
  savedTemplate,
  onRemember,
}) {
  const [selected, setSelected] = useState(savedTemplate?.id || '');
  const [savePrompt, setSavePrompt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const problem = streamSetupProblem(value);
  const template = templates.find((item) => item.id === selected);
  return (
    <section className="scene-template-library admin-panel">
      <h3>Saved stream settings</h3>
      <p>Save all scenes and their input details together. Choose a stream name when saving.</p>
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
                template,
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
            <button
              className="admin-button primary"
              disabled={disabled || busy}
              onClick={() => setSavePrompt({ template: savedTemplate })}
            >
              Save stream settings
            </button>
          )}
        </>
        {template && !problem && (
          <button
            className="admin-button primary"
            disabled={disabled || busy}
            onClick={() => setSavePrompt({ template })}
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
                if (savedTemplate?.id === template.id) onRemember(null);
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
      {savePrompt && (
        <StreamSaveDialog
          screenId={screenId}
          settings={value}
          template={savePrompt.template}
          onDismiss={() => setSavePrompt(null)}
          onSaved={(saved) => {
            onRemember(saved);
            setSelected(saved.id);
            setSavePrompt(null);
            setMessage('All stream settings saved. Reconnect live devices when reusing them.');
            onRefresh().catch((error) => setMessage(`Settings saved. ${error.message}`));
          }}
        />
      )}
    </section>
  );
}
