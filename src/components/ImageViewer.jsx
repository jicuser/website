import React, { useLayoutEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockPageScroll } from '@/lib/pageScrollLock';

export default function ImageViewer({ image, onClose, children }) {
  const dialog = useRef(null);
  const heading = useId();
  useLayoutEffect(() => {
    const node = dialog.current;
    const opener = document.activeElement;
    const unlock = lockPageScroll();
    try {
      node.showModal();
    } catch (error) {
      unlock();
      throw error;
    }
    return () => {
      node.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      unlock();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="jic-image-viewer"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="jic-image-viewer-heading">
        <h2 id={heading}>{image.title}</h2>
        <button type="button" onClick={onClose} aria-label="Close image preview" autoFocus>
          <X size={22} />
        </button>
      </div>
      <div className="jic-image-viewer-scroll">
        <img src={image.url} alt={image.alt || image.title} />
      </div>
      <div className="jic-image-viewer-actions">{children}</div>
    </dialog>,
    document.body,
  );
}
