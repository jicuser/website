import React, { Children, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import '@/styles/guided-editor.css';

/** Keep panels mounted so changing steps never loses edits or save registrations. */
export default function GuidedEditor({ children, label = 'Editor steps', disabled = false }) {
  const panels = Children.toArray(children).filter(React.isValidElement);
  const [selected, setSelected] = useState(0);
  const current = Math.min(selected, Math.max(0, panels.length - 1));
  const id = useId();
  const root = useRef(null);
  function choose(index, focus = 'tab') {
    if (disabled) return;
    setSelected(index);
    requestAnimationFrame(() => {
      const target = document.getElementById(`${id}-${focus}-${index}`);
      target?.focus({ preventScroll: true });
      if (focus === 'tab') target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      else root.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  return (
    <div
      className="guided-editor"
      ref={root}
      onInvalidCapture={(event) => {
        const panel = event.target.closest('[data-guided-panel]');
        if (!panel || panel.parentElement !== root.current) return;
        setSelected(Number(panel.dataset.guidedPanel));
        requestAnimationFrame(() => event.target.focus());
      }}
    >
      <div className="guided-editor-nav" role="tablist" aria-label={label}>
        {panels.map((panel, index) => (
          <button
            key={panel.key}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={current === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={current === index ? 0 : -1}
            disabled={disabled}
            onClick={() => choose(index)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % panels.length
                  : event.key === 'ArrowLeft'
                    ? (index + panels.length - 1) % panels.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? panels.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                choose(next);
              }
            }}
          >
            <span aria-hidden="true">{index + 1}</span>
            {panel.props['data-step']}
          </button>
        ))}
      </div>
      <p className="guided-editor-help" aria-live="polite">
        <strong>
          {current + 1} / {panels.length}
        </strong>
        {panels[current]?.props['data-help'] || 'Make your changes, then save when ready.'}
      </p>
      {panels.map((panel, index) => (
        <div
          key={panel.key}
          data-guided-panel={index}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          tabIndex={0}
          hidden={current !== index}
        >
          {panel}
        </div>
      ))}
      {panels.length > 1 && (
        <div className="guided-editor-actions">
          <button
            type="button"
            disabled={disabled || current === 0}
            onClick={() => choose(current - 1, 'panel')}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </button>
          {current < panels.length - 1 ? (
            <button type="button" disabled={disabled} onClick={() => choose(current + 1, 'panel')}>
              Next: {panels[current + 1].props['data-step']}{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <span>Review your changes before saving.</span>
          )}
        </div>
      )}
    </div>
  );
}
