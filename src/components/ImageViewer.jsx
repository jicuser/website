import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ImageViewer({ image, onClose, children }) {
  const dialog = useRef(null);
  const heading = useId();
  useEffect(() => {
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return createPortal(
    <dialog ref={dialog} className="jic-image-viewer" aria-labelledby={heading} onCancel={onClose}>
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
