/**
 * EditableImage  —  src/components/edit/EditableImage.jsx
 *
 * Usage:
 *   <EditableImage contentKey="home.hero.image" fallback={IMAGES.homeHero}
 *     alt="Hero" className="w-full rounded-lg" />
 *
 * When edit mode is on: shows an upload overlay on hover.
 * Uploads to Supabase Storage and saves the public URL.
 */
import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';

export default function EditableImage({ contentKey, fallback, alt = '', className = '', style }) {
  const { isAdmin }                       = useAuth();
  const { editMode, getContent, uploadImage } = useContent();
  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState('');
  const inputRef                          = useRef(null);

  const src        = getContent(contentKey, fallback);
  const showEditUI = isAdmin && editMode;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { validateImage(file); } catch (err) { setError(err.message); e.target.value = ''; return; }
    setError('');
    setBusy(true);
    try {
      await uploadImage(contentKey, file);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <span className="relative block" style={{ display: 'block' }}>
      <img src={src} alt={alt} className={className} style={style} />

      {showEditUI && (
        <>
          {/* Overlay */}
          <button
            type="button"
            disabled={busy}
            aria-label="Replace image"
            className="absolute inset-0 flex flex-col items-center justify-center
                       bg-black/40 opacity-100 transition-opacity
                       rounded-[inherit] cursor-pointer"
            onClick={() => !busy && inputRef.current?.click()}
            title="Click to replace image"
          >
            {busy ? (
              <Loader2 size={28} className="text-white animate-spin" />
            ) : (
              <>
                <Upload size={28} className="text-white mb-1" />
                <span className="text-white text-xs font-medium">Replace image</span>
              </>
            )}
          </button>

          {/* Dashed border indicator */}
          <span
            className="absolute inset-0 pointer-events-none rounded-[inherit]"
            style={{ outline: '1.5px dashed rgba(20,184,166,0.6)', outlineOffset: 3 }}
          />

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}

      {error && (
        <span className="absolute bottom-2 left-2 right-2 text-xs text-center
                         bg-red-600 text-white px-2 py-1 rounded">
          {error}
        </span>
      )}
    </span>
  );
}
