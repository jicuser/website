import React, { useId } from 'react';
import {
  TV_THEMES,
  tvThemeId,
  tvThemeStyle,
} from '../../../supabase/functions/_shared/tv-themes.js';
import '@/styles/tv-themes.css';

export default function TvThemePicker({ settings, onChange, disabled = false }) {
  const headingId = useId();
  const selected = tvThemeId(settings?.display_theme);
  return (
    <section className="tv-theme-picker" aria-labelledby={headingId}>
      <h3 id={headingId}>TV colour scheme</h3>
      <p>
        Choose colours for this screen’s timetable and messages. Poster artwork keeps its own
        colours.
      </p>
      <div className="tv-theme-choices" role="group" aria-label="TV colour schemes">
        {TV_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            aria-pressed={selected === theme.id}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange('display_theme', theme.id);
            }}
          >
            <span className="tv-theme-swatch" style={tvThemeStyle(theme.id)} aria-hidden="true">
              <span>JIC</span>
              <span>12:45</span>
              <i />
              <i />
              <i />
            </span>
            <strong>{theme.name}</strong>
            <span>{theme.description}</span>
          </button>
        ))}
      </div>
      <p className="tv-layout-help">
        The preview updates your draft. Save display settings to apply this scheme to the TV.
      </p>
    </section>
  );
}
