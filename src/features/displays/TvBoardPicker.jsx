import React, { useState } from 'react';
import TvPreview from '@/components/admin/TvPreview';
import { TV_BOARD_LAYOUTS, tvBoardLayoutId, withTvBoardLayout } from '@/lib/tvBoardLayouts';
import { TV_PRESET_LABELS } from '@/lib/tvEditorLabels';
import TvLayoutThumbnail from './TvLayoutThumbnail';
import {
  canRestoreTvBoardLayout,
  restoreTvBoardLayout,
  snapshotTvBoardLayout,
} from './tvBoardPickerModel';
import '@/styles/tv-design-picker.css';

export default function TvBoardPicker({ settings, screenId, onChange, disabled }) {
  const [selection, setSelection] = useState(null);
  const [moment, setMoment] = useState('standby');
  const [previous, setPrevious] = useState(null);
  const [view, setView] = useState('after');
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const scope = `${screenId}:${orientation}`;
  const candidate = selection?.scope === scope ? selection.id : '';
  const current = settings.display_layouts?.[orientation]?.standby;
  const active = tvBoardLayoutId(current);
  const currentName =
    TV_BOARD_LAYOUTS.find((item) => item.id === active)?.name || current?.name || 'Default layout';
  const selected = TV_BOARD_LAYOUTS.find((item) => item.id === candidate);
  const previewSettings = candidate
    ? { ...settings, display_layouts: withTvBoardLayout(settings, candidate) }
    : settings;
  const showRestore = previous?.scope === scope;
  const canRestore = showRestore && canRestoreTvBoardLayout(settings, previous);
  const titleId = `tv-board-picker-title-${screenId}`;
  const comparisonId = `tv-board-comparison-${screenId}`;

  function applyLayout() {
    if (disabled || !candidate) return;
    const layouts = withTvBoardLayout(settings, candidate);
    setPrevious({
      scope,
      snapshot: snapshotTvBoardLayout(settings),
      applied: JSON.parse(JSON.stringify(layouts[orientation].standby)),
    });
    onChange('display_layouts', layouts);
    setSelection(null);
  }

  function selectView(next, event) {
    setView(next);
    if (event) event.currentTarget.parentElement.querySelector(`[data-view="${next}"]`)?.focus();
  }

  function tabKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    selectView(
      event.key === 'Home'
        ? 'before'
        : event.key === 'End'
          ? 'after'
          : view === 'before'
            ? 'after'
            : 'before',
      event,
    );
  }

  return (
    <section className="tv-board-picker tv-design-picker" aria-labelledby={titleId}>
      <div className="tv-design-heading">
        <div>
          <h3 id={titleId}>Choose a starting layout</h3>
          <p>
            Choose how prayer times and notices share the screen, then compare it with your draft.
          </p>
        </div>
        <span className="tv-design-current">
          <span>Current draft</span>
          <strong>{currentName}</strong>
        </span>
      </div>
      <div
        className="tv-board-choices tv-design-choices"
        role="group"
        aria-label="Prayer board layouts"
      >
        {TV_BOARD_LAYOUTS.map((item) => (
          <button
            key={item.id}
            className="tv-design-choice"
            type="button"
            disabled={disabled}
            aria-pressed={candidate === item.id}
            onClick={() => {
              setSelection({ id: item.id, scope });
              setView('after');
            }}
          >
            <TvLayoutThumbnail layoutId={item.id} orientation={orientation} />
            <span className="tv-design-choice-copy">
              <strong>{item.name}</strong>
              <span>{item.description}</span>
              <small>
                {candidate === item.id
                  ? 'Previewing'
                  : active === item.id
                    ? 'In your draft'
                    : 'Preview layout'}
                <span aria-hidden="true"> →</span>
              </small>
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="tv-design-comparison">
          <div className="tv-design-comparison-heading">
            <div>
              <h4>Compare {selected.name}</h4>
              <p>Preview only. Your draft changes when you choose Use layout.</p>
            </div>
            <span className="tv-design-shape">
              {orientation === 'portrait' ? 'Portrait · 9:16' : 'Landscape · 16:9'}
            </span>
          </div>
          {screenId !== 'shoe-area' && (
            <div
              className="tv-board-moments tv-design-moments"
              role="group"
              aria-label="Preview a moment"
            >
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
          <div className="tv-design-comparison-controls">
            <div role="tablist" aria-label="Before and after layout" className="tv-design-tabs">
              {[
                ['before', 'Before', 'Current draft'],
                ['after', 'After', 'Proposed layout'],
              ].map(([id, label, detail]) => (
                <button
                  type="button"
                  role="tab"
                  id={`${comparisonId}-${id}`}
                  key={id}
                  data-view={id}
                  aria-selected={view === id || (view === 'both' && id === 'after')}
                  aria-controls={`${comparisonId}-panel`}
                  tabIndex={view === id || (view === 'both' && id === 'after') ? 0 : -1}
                  onKeyDown={tabKeys}
                  onClick={() => selectView(id)}
                >
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </button>
              ))}
            </div>
            <button
              className="tv-design-side-toggle"
              type="button"
              aria-pressed={view === 'both'}
              onClick={() => setView(view === 'both' ? 'after' : 'both')}
            >
              Side by side
            </button>
          </div>
          <div
            id={`${comparisonId}-panel`}
            role={view === 'both' ? 'group' : 'tabpanel'}
            aria-label={view === 'both' ? 'Current draft and proposed layout' : undefined}
            aria-labelledby={view === 'both' ? undefined : `${comparisonId}-${view}`}
            className={`tv-design-previews ${view === 'both' ? 'is-side-by-side' : ''}`}
            tabIndex={0}
          >
            {(view === 'before' || view === 'both') && (
              <div className="tv-design-preview-card">
                <p>
                  <strong>Before</strong>
                  <span>Current draft</span>
                </p>
                <TvPreview
                  screenId={screenId}
                  label="Current draft"
                  settings={settings}
                  previewState={moment}
                />
              </div>
            )}
            {(view === 'after' || view === 'both') && (
              <div className="tv-design-preview-card is-proposed">
                <p>
                  <strong>After</strong>
                  <span>{selected.name} · proposed layout</span>
                </p>
                <TvPreview
                  screenId={screenId}
                  label={selected.name}
                  settings={previewSettings}
                  previewState={moment}
                />
              </div>
            )}
          </div>
          <p className="tv-layout-help">
            {moment === 'standby'
              ? 'Both views use this screen’s timetable, notices and settings. Only the everyday arrangement changes.'
              : 'This automatic prayer layout stays the same in both views. Choosing an everyday layout keeps your prayer layouts.'}
          </p>
          <div className="admin-actions tv-design-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={disabled}
              onClick={applyLayout}
            >
              Use {selected.name}
            </button>
            <button type="button" className="admin-button" onClick={() => setSelection(null)}>
              Close preview
            </button>
            <span>Adds to your draft. Save display settings to apply it to the screen.</span>
          </div>
        </div>
      )}
      {showRestore && (
        <div className="tv-design-restore" role="status">
          <span>
            Layout added to your draft.{!canRestore && ' The layout has since been edited.'}
          </span>
          {canRestore && (
            <button
              className="admin-text-button"
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange('display_layouts', restoreTvBoardLayout(settings, previous.snapshot));
                setPrevious(null);
              }}
            >
              Restore previous layout
            </button>
          )}
        </div>
      )}
      <p className="tv-layout-help">
        Only this screen’s {orientation} everyday layout changes. Your other layouts are kept.
      </p>
    </section>
  );
}
