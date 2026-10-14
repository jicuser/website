import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '@/lib/pageScrollLock';

export default function EditorViewport({
  expanded,
  title,
  onClose,
  returnFocusRef,
  suspended = false,
  children,
}) {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  useEffect(() => {
    if (!expanded) return undefined;
    const unlock = lockPageScroll();
    closeButton.current?.focus({ preventScroll: true });
    const keyDown = (event) => {
      if (suspendedRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const targets = [
        ...dialog.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length);
      const first = targets[0],
        last = targets.at(-1);
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
    window.addEventListener('keydown', keyDown);
    return () => {
      unlock();
      window.removeEventListener('keydown', keyDown);
      requestAnimationFrame(() => returnFocusRef?.current?.focus({ preventScroll: true }));
    };
  }, [expanded, returnFocusRef]);
  if (!expanded) return children;
  return createPortal(
    <div
      ref={dialog}
      className="layout-editor-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} editor`}
    >
      <header className="layout-editor-dialog-heading">
        <div>
          <strong>{title}</strong>
          <small>Editing draft</small>
        </div>
        <button ref={closeButton} type="button" className="admin-button" onClick={onClose}>
          Done editing
        </button>
      </header>
      <div className="layout-editor-dialog-content">{children}</div>
    </div>,
    document.body,
  );
}
