import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_PORTRAIT_STANDBY_SCENE,
  DEFAULT_STANDBY_SCENE,
} from '../../../supabase/functions/_shared/tv.js';
import TvDisplayLayoutEditor from './TvDisplayLayoutEditor';

const DAYS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [7, 'Sun'],
];

const clone = (value) => JSON.parse(JSON.stringify(value));

function freshLayout(source, id, orientation) {
  const scene = clone(source);
  scene.id = `scheduled-${id}-${orientation}`;
  scene.name = 'Scheduled scene';
  scene.layers = scene.layers.map((layer, index) => ({
    ...layer,
    id: `${id}-${orientation[0]}-${index + 1}`,
  }));
  return scene;
}

function ruleLabel(scene) {
  const days =
    scene.days?.length === 7
      ? 'Every day'
      : DAYS.filter(([day]) => scene.days?.includes(day))
          .map(([, name]) => name)
          .join(', ');
  return scene.all_day ? `${days} · all day` : `${days} · ${scene.start_time}–${scene.end_time}`;
}

export default function ScheduledScenes({ form, update, screenId }) {
  const scenes = form.scheduled_scenes || [];
  const orientation = form.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const [selected, setSelected] = useState(scenes[0]?.id || '');

  useEffect(() => {
    if (!scenes.length) {
      setSelected('');
      return;
    }
    if (!scenes.some((scene) => scene.id === selected)) setSelected(scenes[0].id);
  }, [scenes, selected]);

  const scene = scenes.find((item) => item.id === selected) || null;
  const defaultLayout = useMemo(
    () => (orientation === 'portrait' ? DEFAULT_PORTRAIT_STANDBY_SCENE : DEFAULT_STANDBY_SCENE),
    [orientation],
  );

  function saveScenes(next) {
    update('scheduled_scenes', next);
  }

  function patchScene(values) {
    if (!scene) return;
    saveScenes(scenes.map((item) => (item.id === scene.id ? { ...item, ...values } : item)));
  }

  function updateLayout(next) {
    if (!scene) return;
    patchScene({
      layouts: {
        ...scene.layouts,
        [orientation]: next,
      },
    });
  }

  function addScene() {
    if (scenes.length >= 12) return;
    const id = crypto.randomUUID().slice(0, 12);
    const next = {
      id,
      name: `Scene ${scenes.length + 1}`,
      enabled: true,
      days: [1, 2, 3, 4, 5, 6, 7],
      all_day: true,
      start_time: '09:00',
      end_time: '17:00',
      layouts: {
        landscape: freshLayout(DEFAULT_STANDBY_SCENE, id, 'landscape'),
        portrait: freshLayout(DEFAULT_PORTRAIT_STANDBY_SCENE, id, 'portrait'),
      },
    };
    saveScenes([...scenes, next]);
    setSelected(id);
  }

  function removeScene() {
    if (!scene || !window.confirm(`Delete “${scene.name}” and its schedule?`)) return;
    saveScenes(scenes.filter((item) => item.id !== scene.id));
  }

  function moveScene(direction) {
    if (!scene) return;
    const index = scenes.findIndex((item) => item.id === scene.id);
    const target = index + direction;
    if (target < 0 || target >= scenes.length) return;
    const next = [...scenes];
    [next[index], next[target]] = [next[target], next[index]];
    saveScenes(next);
  }

  return (
    <section className="tv-scheduled-scenes">
      <div className="admin-heading">
        <div>
          <h3>Scheduled scenes</h3>
          <p>Optional screens that replace Standby at chosen days and times. Prayer screens still take priority.</p>
        </div>
        <button
          type="button"
          className="admin-button"
          disabled={scenes.length >= 12}
          onClick={addScene}
        >
          + New scene
        </button>
      </div>

      {scenes.length > 0 && (
        <nav className="tv-custom-scene-tabs" aria-label="Scheduled TV scenes">
          {scenes.map((item) => (
            <button
              type="button"
              className="admin-button"
              key={item.id}
              aria-pressed={item.id === selected}
              onClick={() => setSelected(item.id)}
            >
              {item.name}
              {!item.enabled ? ' · off' : ''}
            </button>
          ))}
        </nav>
      )}

      {!scene ? (
        <p className="workspace-meta">No extra scheduled scenes. Standby and the automatic prayer scenes continue as normal.</p>
      ) : (
        <>
          <div className="tv-scene-rule-card">
            <div className="tv-scene-rule-title">
              <label>
                Scene name
                <input
                  maxLength={60}
                  value={scene.name}
                  onChange={(event) => patchScene({ name: event.target.value })}
                />
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={scene.enabled}
                  onChange={(event) => patchScene({ enabled: event.target.checked })}
                />
                Use this scene
              </label>
            </div>

            <div className="tv-rule-summary">{ruleLabel(scene)}</div>

            <fieldset className="tv-day-rules">
              <legend>Days</legend>
              <div>
                {DAYS.map(([day, name]) => (
                  <button
                    type="button"
                    key={day}
                    aria-pressed={scene.days.includes(day)}
                    onClick={() => {
                      const next = scene.days.includes(day)
                        ? scene.days.filter((value) => value !== day)
                        : [...scene.days, day].sort((a, b) => a - b);
                      if (next.length) patchScene({ days: next });
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="tv-time-rules">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={scene.all_day}
                  onChange={(event) => patchScene({ all_day: event.target.checked })}
                />
                All day
              </label>
              {!scene.all_day && (
                <>
                  <label>
                    From
                    <input
                      type="time"
                      value={scene.start_time}
                      onChange={(event) => patchScene({ start_time: event.target.value })}
                    />
                  </label>
                  <label>
                    Until
                    <input
                      type="time"
                      value={scene.end_time}
                      onChange={(event) => patchScene({ end_time: event.target.value })}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="admin-actions tv-scene-order-actions">
              <button type="button" className="admin-button" onClick={() => moveScene(-1)}>
                Move earlier
              </button>
              <button type="button" className="admin-button" onClick={() => moveScene(1)}>
                Move later
              </button>
              <button type="button" className="admin-button" onClick={removeScene}>
                Delete scene
              </button>
            </div>
            <p className="workspace-meta">If two scheduled scenes match, the first one in this list is shown.</p>
          </div>

          <TvDisplayLayoutEditor
            screenId={screenId}
            settings={form}
            preset={`scheduled-${scene.id}`}
            titleOverride={scene.name}
            onChange={update}
            sceneOverride={scene.layouts[orientation]}
            onSceneChange={updateLayout}
            resetScene={defaultLayout}
            allowBlocks
          />
        </>
      )}
    </section>
  );
}
