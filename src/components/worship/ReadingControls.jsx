import React from 'react';

export default function ReadingControls({
  fontSize,
  onFontSizeChange,
  showMeaning,
  onMeaningChange,
  meaningLabel = 'Show meaning',
  showTransliteration,
  onTransliterationChange,
}) {
  return (
    <details className="worship-preferences">
      <summary>
        Reading display{' '}
        <span>
          {fontSize}px{showMeaning ? ' · meaning on' : ''}
        </span>
      </summary>
      <fieldset className="worship-display-controls">
        <legend className="sr-only">Reading display</legend>
        <label className="worship-font-control">
          Arabic text size
          <input
            aria-label="Arabic text size"
            type="range"
            min="24"
            max="48"
            step="2"
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
          />
          <output>{fontSize}px</output>
        </label>
        <label>
          <input
            type="checkbox"
            checked={showMeaning}
            onChange={(event) => onMeaningChange(event.target.checked)}
          />
          {meaningLabel}
        </label>
        {onTransliterationChange && (
          <label>
            <input
              type="checkbox"
              checked={showTransliteration}
              onChange={(event) => onTransliterationChange(event.target.checked)}
            />
            Show transliteration
          </label>
        )}
      </fieldset>
    </details>
  );
}
