import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PageEditor from './PageEditor';
import { AdminSaveProvider, useAdminSave } from '@/context/AdminSaveContext';

function EditorDialog({ path, onClose }) {
  const dialog = useRef(null);
  const { dirty, saving, saveCurrent } = useAdminSave();
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  const close = () => {
    if (!saving && (!dirty || window.confirm('Discard unsaved changes?'))) onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="admin-console admin-edit-dialog"
      aria-label="Edit this page"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="admin-edit-dialog-actions">
        <p>Edit the page you’re viewing.</p>
        <button
          className="admin-button primary"
          disabled={!dirty || saving}
          onClick={() => saveCurrent().catch(() => {})}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button className="admin-button" onClick={close} aria-label="Close editor">
          <X size={20} />
        </button>
      </div>
      <PageEditor initialPath={path} inline />
    </dialog>
  );
}
export default function WebsitePageEditor(props) {
  return createPortal(
    <AdminSaveProvider>
      <EditorDialog {...props} />
    </AdminSaveProvider>,
    document.body,
  );
}
