import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '@/lib/pageScrollLock';
import '@/styles/layout-canvas.css';

// Render at TV dimensions before scaling, so minimum text and control sizes in
// the display do not expand relative to the layout on a narrow admin screen.
export function TvScaledPreview({ orientation, children }) {
  const viewport = useRef(null);
  const [scale, setScale] = useState(0);
  const portrait = orientation === 'portrait';
  const width = portrait ? 720 : 1280;
  const height = portrait ? 1280 : 720;

  useEffect(() => {
    const resize = () => {
      const bounds = viewport.current?.getBoundingClientRect();
      if (bounds) setScale(Math.min(bounds.width / width, bounds.height / height));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={viewport} className="tv-scaled-preview">
      <div
        className="tv-scaled-preview-content"
        style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export default function TvFinalPreview({ open, onClose, orientation, title, children }) {
  const closeRef = useRef(onClose);
  const closeButton = useRef(null);
  const dialog = useRef(null);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const unlock = lockPageScroll();
    closeButton.current?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const targets = [
        ...dialog.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]'),
      ];
      const first = targets[0];
      const last = targets.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlock();
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={dialog}
      className="tv-final-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} TV preview`}
    >
      <div className="tv-final-preview-bar">
        <div>
          <strong>{title}</strong>
          <span>
            {orientation === 'portrait' ? 'Portrait · 9:16' : 'Landscape · 16:9'} · draft preview
          </span>
        </div>
        <button ref={closeButton} type="button" className="admin-button" onClick={onClose}>
          Back to editing
        </button>
      </div>
      <div className={`tv-final-preview-stage ${orientation === 'portrait' ? 'is-portrait' : ''}`}>
        <TvScaledPreview orientation={orientation}>{children}</TvScaledPreview>
      </div>
    </div>,
    document.body,
  );
}
