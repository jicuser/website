import React, { useEffect, useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';

export default function ProfilePhotoInput({ file, imageUrl, disabled, onSelect, onRemove }) {
  const id = useId();
  const input = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setObjectUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = file ? objectUrl : imageUrl;
  return (
    <div className="admin-profile-photo-field">
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-label="Profile photo"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = '';
          if (!selected) return;
          try {
            validateImage(selected);
            setError('');
            onSelect(selected);
          } catch (problem) {
            setError(problem.message);
          }
        }}
      />
      <button
        type="button"
        className="admin-profile-photo-picker"
        disabled={disabled}
        aria-label={preview ? 'Change profile photo' : 'Add profile photo'}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onClick={() => input.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt="Selected profile photo" />
            <span className="admin-profile-photo-caption">Change photo</span>
          </>
        ) : (
          <>
            <Plus size={32} aria-hidden="true" />
            <span>Add photo</span>
          </>
        )}
      </button>
      <p id={`${id}-hint`}>JPG, PNG or WebP · up to 8 MB</p>
      {(file || imageUrl) && (
        <button
          type="button"
          className="admin-button"
          disabled={disabled}
          onClick={() => {
            setError('');
            onRemove();
          }}
        >
          Remove photo
        </button>
      )}
      {error && (
        <p id={`${id}-error`} className="admin-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
