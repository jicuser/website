import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { TV_PANELS } from '../../../supabase/functions/_shared/tv.js';

const LAYOUTS = [
  ['columns', 'Side by side'],
  ['rows', 'Top and bottom'],
  ['grid', 'Grid'],
  ['focus-left', 'Large panel on left'],
  ['focus-right', 'Large panel on right'],
];

export default function TvLayoutEditor({ value, onChange, disabled }) {
  const panels = value.panels;
  const label = (id) => TV_PANELS.find(([key]) => id === key)?.[1];
  function move(index, direction) {
    const next = [...panels];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange('panels', next);
  }
  return (
    <fieldset className="admin-tv-layout-editor" disabled={disabled}>
      <legend>Choose up to four panels</legend>
      <div className="admin-tv-sources">
        {TV_PANELS.map(([id, text]) => (
          <label className="admin-check" key={id}>
            <input
              type="checkbox"
              checked={panels.includes(id)}
              disabled={!panels.includes(id) && panels.length >= 4}
              onChange={(event) =>
                onChange(
                  'panels',
                  event.target.checked ? [...panels, id] : panels.filter((item) => item !== id),
                )
              }
            />
            {text}
          </label>
        ))}
      </div>
      <label>
        Arrange the screen
        <select value={value.layout} onChange={(event) => onChange('layout', event.target.value)}>
          {LAYOUTS.map(([id, text]) => (
            <option value={id} key={id}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <div
        className="tv-panel-layout admin-tv-layout-map"
        data-layout={value.layout}
        data-count={panels.length}
        style={{
          '--panel-count': Math.max(1, panels.length),
          '--panel-rows': Math.max(1, Math.ceil(panels.length / 2)),
        }}
        aria-label="Landscape layout preview"
      >
        {panels.map((id, index) => (
          <div key={id}>
            <span>{index + 1}</span>
            {label(id)}
          </div>
        ))}
      </div>
      {panels.length === 0 && <p role="status">Choose at least one panel.</p>}
      <ol className="admin-tv-panel-order">
        {panels.map((id, index) => (
          <li key={id}>
            <span>
              {index + 1}. {label(id)}
            </span>
            <button
              type="button"
              className="admin-button"
              disabled={index === 0}
              aria-label={`Move ${label(id)} earlier`}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={index === panels.length - 1}
              aria-label={`Move ${label(id)} later`}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={16} />
            </button>
          </li>
        ))}
      </ol>
      <p className="admin-tv-help">
        The numbers show panel order. For a large left or right panel, put that source first. Update
        this TV to apply the layout.
      </p>
    </fieldset>
  );
}
