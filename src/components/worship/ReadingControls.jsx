import React from 'react';

function DisplaySwitch({ label, checked, onChange }) {
  return (
    <button type="button" className="worship-display-switch" role="switch" aria-label={label} aria-checked={checked === true} onClick={() => onChange(checked !== true)}>
      <span>{label}</span>
      <span className="worship-switch-state" aria-hidden="true">{checked ? 'On' : 'Off'}</span>
      <span className="worship-switch-track" aria-hidden="true"><span /></span>
    </button>
  );
}

export default function ReadingControls({
  fontSize, onFontSizeChange, showMeaning, onMeaningChange,
  meaningLabel = 'Show meaning', showTransliteration, onTransliterationChange,
}) {
  return (
    <details className="worship-preferences">
      <summary>
        Reading display{' '}
        <span>{fontSize}px · {showMeaning ? 'Translation on' : 'Translation off'}{onTransliterationChange ? ` · Transliteration ${showTransliteration ? 'on' : 'off'}` : ''}</span>
      </summary>
      <fieldset className="worship-display-controls">
        <legend className="sr-only">Reading display</legend>
        <label className="worship-font-control">
          Arabic text size
          <input aria-label="Arabic text size" type="range" min="24" max="48" step="2" value={fontSize} onChange={(event) => onFontSizeChange(Number(event.target.value))} />
          <output>{fontSize}px</output>
        </label>
        <DisplaySwitch label={meaningLabel} checked={showMeaning} onChange={onMeaningChange} />
        {onTransliterationChange && <DisplaySwitch label="Show transliteration" checked={showTransliteration} onChange={onTransliterationChange} />}
      </fieldset>
    </details>
  );
}
