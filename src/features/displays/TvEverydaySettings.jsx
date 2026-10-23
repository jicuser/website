import React, { useEffect, useState } from 'react';
import TvPreview from '@/components/admin/TvPreview';
import { tvAutomaticScene, tvDisplayScene } from '../../../supabase/functions/_shared/tv.js';
import {
  TV_EVERYDAY_SCENES,
  tvChangingContentRect,
  tvPersistentLayers,
} from '../../../supabase/functions/_shared/tv-everyday.js';
import TvLayoutThumbnail from './TvLayoutThumbnail';
import '@/styles/tv-design-picker.css';

const sceneName = (kind) => TV_EVERYDAY_SCENES.find((scene) => scene.id === kind)?.name || kind;
const labels = {
  brand: 'JIC logo',
  clock: 'Clock',
  times: 'Prayer timetable',
  next: 'Next prayer',
  poster: 'Poster',
  'poster-next': 'Poster',
  text: 'Text notice',
  ramadan: 'Sponsorship board',
};
const durations = (value) =>
  [...new Set([10, 15, 20, 30, 60, 90, 120, 180, 300, value])].sort((a, b) => a - b);

export default function TvEverydaySettings({ settings, screenId, onChange, disabled }) {
  const programme = settings.everyday_display;
  const orientation = settings.display_orientation;
  const standby = tvDisplayScene(settings, 'standby');
  const [now, setNow] = useState(() => new Date());
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const current = tvAutomaticScene(settings, now, { includeScheduled: false });
  const selected = programme.persistent_layer_ids[orientation];
  const fixedOptions = standby.layers.filter((layer) => !layer.hidden && layer.type !== 'empty');
  function patch(values) {
    setMessage('');
    onChange('everyday_display', { ...programme, ...values });
  }
  function changeRotation(index, values) {
    patch({
      rotation: programme.rotation.map((item, offset) =>
        offset === index ? { ...item, ...values } : item,
      ),
    });
  }
  function move(index, direction) {
    const next = [...programme.rotation];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    patch({ rotation: next });
  }
  function keepItem(id, checked) {
    const ids = checked ? [...selected, id] : selected.filter((item) => item !== id);
    const next = {
      ...programme,
      persistent_layer_ids: { ...programme.persistent_layer_ids, [orientation]: ids },
    };
    if (!tvChangingContentRect(tvPersistentLayers(next, standby, orientation))) {
      setMessage(
        'Leave room for changing scenes. Remove a fixed item or move it in the timetable layout.',
      );
      return;
    }
    patch({ persistent_layer_ids: next.persistent_layer_ids });
  }
  return (
    <section className="tv-everyday-settings" aria-labelledby={`tv-everyday-${screenId}`}>
      <div className="tv-everyday-heading">
        <div>
          <h3 id={`tv-everyday-${screenId}`}>Everyday content</h3>
          <p>Choose what shows between prayers and presentations.</p>
        </div>
        <span className="tv-everyday-shape">
          {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
        </span>
      </div>
      <div className="tv-everyday-modes" role="group" aria-label="Everyday display mode">
        {[
          ['fixed', 'Keep one scene', 'A timetable or sponsorship board'],
          ['rotation', 'Rotate scenes', 'Change scenes in a repeating order'],
        ].map(([id, name, description]) => (
          <button
            type="button"
            key={id}
            disabled={disabled}
            aria-pressed={programme.mode === id}
            onClick={() => patch({ mode: id })}
          >
            <strong>{name}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
      <div className="tv-everyday-content">
        <div className="tv-everyday-controls">
          {programme.mode === 'fixed' ? (
            <label>
              Scene to keep on screen
              <select
                value={programme.fixed_scene}
                onChange={(event) => patch({ fixed_scene: event.target.value })}
              >
                {TV_EVERYDAY_SCENES.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <ol className="tv-rotation-scenes" aria-label="Scene rotation order">
                {programme.rotation.map((item, index) => (
                  <li key={item.kind}>
                    <div className="tv-rotation-fields">
                      <label>
                        Scene {index + 1}
                        <select
                          aria-label={`Scene ${index + 1}`}
                          value={item.kind}
                          onChange={(event) => changeRotation(index, { kind: event.target.value })}
                        >
                          {TV_EVERYDAY_SCENES.filter(
                            (scene) =>
                              scene.id === item.kind ||
                              !programme.rotation.some((other) => other.kind === scene.id),
                          ).map((scene) => (
                            <option key={scene.id} value={scene.id}>
                              {scene.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Show for
                        <select
                          aria-label={`Show ${sceneName(item.kind)} for`}
                          value={item.duration_seconds}
                          onChange={(event) =>
                            changeRotation(index, { duration_seconds: Number(event.target.value) })
                          }
                        >
                          {durations(item.duration_seconds).map((seconds) => (
                            <option key={seconds} value={seconds}>
                              {seconds} seconds
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="tv-rotation-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={index === 0}
                        aria-label={`Move ${sceneName(item.kind)} earlier`}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        disabled={index === programme.rotation.length - 1}
                        aria-label={`Move ${sceneName(item.kind)} later`}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        disabled={programme.rotation.length === 1}
                        aria-label={`Remove ${sceneName(item.kind)} from rotation`}
                        onClick={() =>
                          patch({
                            rotation: programme.rotation.filter((_, offset) => offset !== index),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="admin-button"
                disabled={programme.rotation.length >= TV_EVERYDAY_SCENES.length}
                onClick={() => {
                  const next = TV_EVERYDAY_SCENES.find(
                    (scene) => !programme.rotation.some((item) => item.kind === scene.id),
                  );
                  if (next)
                    patch({
                      rotation: [...programme.rotation, { kind: next.id, duration_seconds: 30 }],
                    });
                }}
              >
                + Add scene
              </button>
              {programme.rotation.length === 1 && (
                <p>Add another scene to start changing content.</p>
              )}
            </>
          )}
          <details className="tv-fixed-items">
            <summary>
              Keep items visible across scenes
              {selected.length ? ` · ${selected.length} selected` : ''}
            </summary>
            <p>
              Choose items from the timetable layout. They stay in position, with other scenes
              fitted into the space around them.
            </p>
            <div className="tv-fixed-item-options">
              {fixedOptions.map((layer, index) => (
                <label className="admin-check" key={layer.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(layer.id)}
                    onChange={(event) => keepItem(layer.id, event.target.checked)}
                  />
                  {labels[layer.type] || 'Content'}
                  {['poster', 'poster-next'].includes(layer.type)
                    ? ` ${(layer.poster_offset ?? index) + 1}`
                    : layer.type === 'text' && layer.text
                      ? ` · ${layer.text.slice(0, 45)}`
                      : ''}
                </label>
              ))}
            </div>
            <small>Prayer screens and timed overrides use their own layouts.</small>
          </details>
          {message && (
            <p role="alert" className="admin-field-error">
              {message}
            </p>
          )}
        </div>
        <figure className="tv-everyday-miniature">
          <TvLayoutThumbnail scene={current.scene} orientation={orientation} />
          <figcaption>
            <strong>Draft · {current.name}</strong>
            <span>
              {programme.mode === 'rotation'
                ? `Scene ${current.rotation_index + 1} of ${programme.rotation.length} · changes in ${current.remaining_seconds}s`
                : 'Fixed scene'}
            </span>
            <small>Illustrative positions</small>
          </figcaption>
        </figure>
      </div>
      <details
        className="tv-everyday-preview"
        onToggle={(event) => setPreview(event.currentTarget.open)}
      >
        <summary>Preview everyday content</summary>
        {preview && <TvPreview screenId={screenId} label="Everyday content" settings={settings} />}
      </details>
    </section>
  );
}
