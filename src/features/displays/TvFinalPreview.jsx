import React, { useEffect, useRef } from 'react';

export default function TvFinalPreview({ open, onClose, orientation, title, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="tv-final-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} final TV preview`}
    >
      <div className="tv-final-preview-bar">
        <div>
          <strong>{title}</strong>
          <span>{orientation === 'portrait' ? '9:16 portrait' : '16:9 landscape'} · final preview</span>
        </div>
        <button type="button" className="admin-button" onClick={onClose}>
          Close preview
        </button>
      </div>
      <div className={`tv-final-preview-stage ${orientation === 'portrait' ? 'is-portrait' : ''}`}>
        {children}
      </div>
    </div>
  );
}
