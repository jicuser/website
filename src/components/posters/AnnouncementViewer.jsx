import React, { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockPageScroll } from '@/lib/pageScrollLock';

/** Notices use real text at reading size, independent of the TV poster canvas. */
export default function AnnouncementViewer({ poster, onClose }) {
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
      unlock();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      className="jic-announcement-viewer"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="jic-image-viewer-heading">
        <h2 id={heading}>{poster.title}</h2>
        <button type="button" onClick={onClose} aria-label="Close announcement" autoFocus>
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="jic-announcement-reading" dir="auto">
        {poster.body
          .split(/\n\s*\n|\n/)
          .filter((line) => line.trim())
          .map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        {(poster.images || []).map((url) => (
          <img key={url} src={url} alt="Announcement picture" />
        ))}
      </div>
    </dialog>,
    document.body,
  );
}
