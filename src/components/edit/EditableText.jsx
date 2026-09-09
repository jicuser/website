/**
 * EditableText  —  src/components/edit/EditableText.jsx
 *
 * Usage:
 *   <EditableText contentKey="home.hero.heading" fallback="Welcome to JIC">
 *     {(text) => <h1>{text}</h1>}
 *   </EditableText>
 *
 * When edit mode is off:  renders children with the live/fallback text.
 * When edit mode is on:   wraps in a dashed outline + pencil button.
 *                         Clicking opens an inline editor modal.
 */
import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';

export default function EditableText({ contentKey, fallback, multiline = false, children }) {
  const { isAdmin }                  = useAuth();
  const { editMode, getContent, saveContent } = useContent();
  const [open, setOpen]              = useState(false);
  const [draft, setDraft]            = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]              = useState(false);

  const value = getContent(contentKey, fallback);
  const showEditUI = isAdmin && editMode;

  function openEditor() {
    setError('');
    setDraft(value);
    setOpen(true);
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      await saveContent(contentKey, draft);
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Unable to save. Your text is still here; please retry.');
    } finally {
      setBusy(false);
    }
  }

  if (!showEditUI) {
    return children ? children(value) : <span>{value}</span>;
  }

  return (
    <>
      {/* Editable wrapper — dashed teal outline on hover */}
      <span
        className="relative inline-block group cursor-pointer"
        style={{ outline: '1.5px dashed rgba(20,184,166,0.5)', outlineOffset: 3, borderRadius: 4 }}
        title={`Edit: ${contentKey}`}
      >
        {children ? children(value) : <span>{value}</span>}

        {/* Pencil badge */}
        <button
          onClick={openEditor}
          className="absolute -top-2 -right-2 z-50 flex items-center justify-center
                     w-9 h-9 rounded-full bg-teal-500 text-white shadow
                     opacity-100 transition-opacity"
          title="Edit this text"
        >
          <Pencil size={16} />
        </button>
      </span>

      {/* Edit modal */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-gray-400">{contentKey}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            {multiline ? (
              <textarea
                autoFocus
                rows={6}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            ) : (
              <input
                autoFocus
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            )}

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                           text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-teal-500 hover:bg-teal-600
                           text-white font-medium flex items-center gap-2 disabled:opacity-60"
              >
                {busy ? 'Saving…' : <><Check size={14} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
