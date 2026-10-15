import React, { useState } from 'react';
import TvPreview from '@/components/admin/TvPreview';
import { TV_BOARD_LAYOUTS, tvBoardLayoutId, withTvBoardLayout } from '@/lib/tvBoardLayouts';
import { TV_PRESET_LABELS } from '@/lib/tvEditorLabels';

export default function TvBoardPicker({ settings, screenId, onChange, disabled }) {
  const [candidate, setCandidate] = useState('');
  const [moment, setMoment] = useState('standby');
  const [previous, setPrevious] = useState(null);
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const saved = settings.display_layouts?.[orientation]?.standby;
  const active = tvBoardLayoutId(saved);
  const selected = TV_BOARD_LAYOUTS.find((item) => item.id === candidate);
  const previewSettings = candidate
    ? { ...settings, display_layouts: withTvBoardLayout(settings, candidate) }
    : settings;

  function applyLayout() {
    if (disabled || !candidate) return;
    setPrevious(saved);
    onChange('display_layouts', withTvBoardLayout(settings, candidate));
    setCandidate('');
  }

  return (
    <section className="tv-board-picker" aria-labelledby="tv-board-picker-title">
      <div className="tv-board-picker-heading">
        <div>
          <h3 id="tv-board-picker-title">Choose a starting layout</h3>
          <p>Preview a style, then adjust it for this screen.</p>
        </div>
        <span className="tv-board-current">
          {active ? TV_BOARD_LAYOUTS.find((item) => item.id === active).name : 'Custom layout'}
        </span>
      </div>
      <div className="tv-board-choices" role="group" aria-label="Prayer board layouts">
        {TV_BOARD_LAYOUTS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={candidate === item.id}
            onClick={() => {
              setCandidate(item.id);
              setMoment('standby');
            }}
          >
            <span className={`tv-board-thumbnail is-${item.id}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>{item.name}</strong>
              <span>{item.description}</span>
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="tv-board-comparison">
          <div className="tv-board-preview-heading">
            <strong>{selected.name} · preview</strong>
            <span>Preview only · nothing is published</span>
          </div>
          {screenId !== 'shoe-area' && (
            <div className="tv-board-moments" role="group" aria-label="Preview a moment">
              {Object.entries(TV_PRESET_LABELS).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={moment === id}
                  onClick={() => setMoment(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <TvPreview
            screenId={screenId}
            label={selected.name}
            settings={previewSettings}
            previewState={moment}
          />
          <p className="tv-layout-help">
            {moment === 'standby'
              ? 'Uses the published JIC timetable and this screen’s selected posters.'
              : 'Shows your configured prayer layout. These automatic layouts are kept when you change the everyday style.'}
          </p>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={disabled}
              onClick={applyLayout}
            >
              Use {selected.name}
            </button>
            <button type="button" className="admin-button" onClick={() => setCandidate('')}>
              Close preview
            </button>
          </div>
        </div>
      )}
      {previous && (
        <p className="tv-board-restore" role="status">
          Layout added to your draft.{' '}
          <button
            className="admin-text-button"
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange('display_layouts', {
                ...settings.display_layouts,
                [orientation]: { ...settings.display_layouts[orientation], standby: previous },
              });
              setPrevious(null);
            }}
          >
            Restore previous layout
          </button>
        </p>
      )}
      <p className="tv-layout-help">
        Only this screen’s {orientation} everyday layout changes. Save display settings when you are
        ready.
      </p>
    </section>
  );
}
