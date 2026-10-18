import React, { useState } from 'react';
import TvPreview from '@/components/admin/TvPreview';
import { tvSettingsChanges } from '@/lib/tvSettingsReview';

export default function TvDraftReview({ saved, draft, screenId, preset }) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState('draft');
  const changes = tvSettingsChanges(saved, draft);
  return (
    <details
      className="tv-draft-review"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>Review your changes before saving</summary>
      <p>Compare this screen’s saved settings with your changes. The TV updates when you save.</p>
      {changes.length > 0 && (
        <ul aria-label="Changed settings">
          {changes.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}
      <div className="tv-review-views" role="group" aria-label="Compare saved and draft display">
        <button
          type="button"
          className="admin-button"
          aria-pressed={view === 'saved'}
          onClick={() => setView('saved')}
        >
          Before · saved display
        </button>
        <button
          type="button"
          className="admin-button"
          aria-pressed={view === 'draft'}
          onClick={() => setView('draft')}
        >
          After · your changes
        </button>
      </div>
      {expanded && (
        <TvPreview
          screenId={screenId}
          label={view === 'saved' ? 'Before · saved display' : 'After · your changes'}
          settings={view === 'saved' ? saved : draft}
          previewState={preset}
        />
      )}
    </details>
  );
}
