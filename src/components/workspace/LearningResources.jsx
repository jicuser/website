import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { safeDownloadUrl } from '@/lib/customForms';
import { checked, dateLabel, Field } from './shared';
import { safeFilename } from '../../../supabase/functions/custom-forms/validation.mjs';

const formats = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp4',
  'video/mp4',
];

export default function LearningResources({ courseId, canTeach = false }) {
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('file');
  const [page, setPage] = useState(0);
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(
        await checked(
          supabase
            .from('learning_resources')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .range(page * 25, page * 25 + 24),
        ),
      );
    } catch {
      setRows([]);
      setError('Course resources could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [courseId, page]);
  useEffect(() => {
    reload();
  }, [reload]);
  const run = async (operation) => {
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (failure) {
      setError(failure.message || 'The resource could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="workspace-header">
        <h3>Course materials</h3>
        <button disabled={loading || busy} onClick={reload}>
          Refresh materials
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {canTeach && (
        <form
          className="workspace-card workspace-form"
          onSubmit={(event) => {
            event.preventDefault();
            const element = event.currentTarget;
            const data = new FormData(element);
            run(async () => {
              const record = {
                course_id: courseId,
                title: String(data.get('title')).trim(),
                description: String(data.get('description')).trim(),
                published: data.get('published') === 'on',
                created_by: auth.user.id,
              };
              let uploadedPath = null;
              if (mode === 'link') {
                const url = safeDownloadUrl(data.get('url'));
                if (!url) throw new Error('Use a secure HTTPS link.');
                record.url = url;
              } else {
                const file = data.get('file');
                if (!(file instanceof File) || !file.size || file.size > 25 * 1024 * 1024)
                  throw new Error('Choose a file of up to 25 MB.');
                const mime = file.type === 'audio/x-m4a' ? 'audio/mp4' : file.type;
                if (!formats.includes(mime))
                  throw new Error('Choose a PDF, JPEG, PNG, WebP, MP3, M4A or MP4 file.');
                uploadedPath = `${courseId}/${auth.user.id}/${crypto.randomUUID()}`;
                await checked(
                  supabase.storage
                    .from('course-resources')
                    .upload(uploadedPath, file, { contentType: mime, upsert: false }),
                );
                record.object_path = uploadedPath;
                record.file_name = safeFilename(file.name);
                record.mime_type = mime;
              }
              try {
                await checked(
                  supabase.from('learning_resources').insert(record).select('id').single(),
                );
              } catch (failure) {
                if (uploadedPath)
                  await supabase.storage.from('course-resources').remove([uploadedPath]);
                throw failure;
              }
              element.reset();
              await reload();
            });
          }}
        >
          <h3>Add course material</h3>
          <fieldset disabled={busy}>
            <Field label="Title">
              <input name="title" required maxLength={160} />
            </Field>
            <Field label="Description">
              <textarea name="description" rows={3} maxLength={4000} />
            </Field>
            <Field label="Material type">
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="file">Private course file</option>
                <option value="link">Website link</option>
              </select>
            </Field>
            {mode === 'file' ? (
              <Field label="Choose file">
                <input name="file" type="file" required accept={formats.join(',')} />
              </Field>
            ) : (
              <Field label="HTTPS address">
                <input name="url" type="url" required maxLength={2000} placeholder="https://" />
              </Field>
            )}
            <label>
              <input name="published" type="checkbox" /> Publish for enrolled students and guardians
            </label>
            <button>{busy ? 'Saving…' : 'Add material'}</button>
          </fieldset>
          <p className="workspace-meta">
            Course files: PDF, JPEG, PNG, WebP, MP3, M4A or MP4, up to 25 MB.
          </p>
        </form>
      )}
      {loading ? (
        <p role="status">Loading course materials…</p>
      ) : rows.length === 0 ? (
        <p>No course materials have been shared here yet.</p>
      ) : (
        rows.map((row) => (
          <article className="workspace-card" key={row.id}>
            <h3>{row.title}</h3>
            <p>{row.description}</p>
            <p className="workspace-meta">
              {dateLabel(row.created_at)}
              {canTeach ? (row.published ? ' · Published' : ' · Draft') : ''}
            </p>
            <div className="workspace-actions">
              {row.url && safeDownloadUrl(row.url) ? (
                <a
                  className="workspace-button"
                  href={safeDownloadUrl(row.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open material
                </a>
              ) : row.object_path ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const data = await checked(
                        supabase.storage
                          .from('course-resources')
                          .createSignedUrl(row.object_path, 60, {
                            download: row.file_name || true,
                          }),
                      );
                      const url = safeDownloadUrl(data.signedUrl);
                      if (!url) throw new Error('A safe download link could not be created.');
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = row.file_name || 'course-material';
                      anchor.click();
                    })
                  }
                >
                  Download {row.file_name || 'material'}
                </button>
              ) : (
                <p>This material is unavailable.</p>
              )}
              {canTeach && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await checked(
                        supabase
                          .from('learning_resources')
                          .update({ published: !row.published })
                          .eq('id', row.id)
                          .select('id')
                          .single(),
                      );
                      await reload();
                    })
                  }
                >
                  {row.published ? 'Unpublish' : 'Publish for students'}
                </button>
              )}
            </div>
            {canTeach && (
              <details>
                <summary>Edit title and description</summary>
                <form
                  className="workspace-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    run(async () => {
                      await checked(
                        supabase
                          .from('learning_resources')
                          .update({
                            title: String(data.get('title')).trim(),
                            description: String(data.get('description')).trim(),
                          })
                          .eq('id', row.id)
                          .select('id')
                          .single(),
                      );
                      await reload();
                    });
                  }}
                >
                  <fieldset disabled={busy}>
                    <Field label="Material title">
                      <input name="title" required maxLength={160} defaultValue={row.title} />
                    </Field>
                    <Field label="Material description">
                      <textarea
                        name="description"
                        rows={3}
                        maxLength={4000}
                        defaultValue={row.description}
                      />
                    </Field>
                    <button>Save details</button>
                  </fieldset>
                </form>
              </details>
            )}
          </article>
        ))
      )}
      <div className="workspace-actions">
        <button disabled={loading || page === 0} onClick={() => setPage((value) => value - 1)}>
          Previous materials
        </button>
        <span>Page {page + 1}</span>
        <button
          disabled={loading || rows.length < 25}
          onClick={() => setPage((value) => value + 1)}
        >
          Next materials
        </button>
      </div>
    </section>
  );
}
