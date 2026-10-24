import React, { useRef } from 'react';
import { Move } from 'lucide-react';
import { noticePlacement, NOTICE_POSITIONS, HOME_POSITIONS } from '@/lib/noticePlacement';
import '@/styles/notice-placement.css';
const labels = {
  'before-events': 'Above What’s on',
  'after-events': 'Below What’s on',
  'after-community': 'Below community links',
  'top-left': 'Top left',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
};
export default function NoticePlacementEditor({ value, onChange, title = 'Notice' }) {
  const settings = noticePlacement(value);
  const preview = useRef(null);
  function drag(event) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = preview.current.getBoundingClientRect();
    const x = event.clientX - bounds.left,
      y = event.clientY - bounds.top;
    if (settings.notification)
      onChange({
        ...settings,
        position: `${y < bounds.height / 2 ? 'top' : 'bottom'}-${x < bounds.width / 2 ? 'left' : 'right'}`,
      });
    else
      onChange({
        ...settings,
        placement: HOME_POSITIONS[Math.min(2, Math.max(0, Math.floor((y / bounds.height) * 3)))],
      });
  }
  return (
    <fieldset className="notice-placement-editor">
      <legend>Where it appears</legend>
      <label>
        Home page position
        <select
          value={settings.placement}
          onChange={(event) => onChange({ ...settings, placement: event.target.value })}
        >
          {HOME_POSITIONS.map((item) => (
            <option key={item} value={item}>
              {labels[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="notice-toggle">
        <input
          type="checkbox"
          checked={settings.notification}
          onChange={(event) => onChange({ ...settings, notification: event.target.checked })}
        />{' '}
        Show a website notification
      </label>
      {settings.notification && (
        <label>
          Notification position
          <select
            value={settings.position}
            onChange={(event) => onChange({ ...settings, position: event.target.value })}
          >
            {NOTICE_POSITIONS.map((item) => (
              <option key={item} value={item}>
                {labels[item]}
              </option>
            ))}
          </select>
        </label>
      )}
      <p>
        Drag the notice in the preview, or use the position selector. Website notifications appear
        once per visit; they do not send a phone push alert.
      </p>
      <div
        ref={preview}
        className="notice-placement-preview"
        aria-label="Website placement preview"
      >
        <span>Header & prayer times</span>
        <span>What’s on</span>
        <span>Community & footer</span>
        <button
          type="button"
          className={`notice-preview-card ${settings.notification ? settings.position : settings.placement}`}
          aria-label="Drag notice to choose its position"
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={drag}
          onPointerUp={(event) => {
            drag(event);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
        >
          <Move size={16} />
          {title || 'Notice'}
        </button>
      </div>
    </fieldset>
  );
}
