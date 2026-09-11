import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Save, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';

const blank = {
  section_key: '',
  title: '',
  body: '',
  background_image_url: '',
  image_urls: [],
  sort_order: 0,
  published: true,
};

async function uploadImage(file, folder) {
  if (!file) return '';
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  ) {
    throw new Error('Choose a JPG, PNG or WebP under 8 MB.');
  }
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('site-images')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

export default function PageSectionsEditor({ pagePath }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('page_sections')
      .select('*')
      .eq('page_path', pagePath)
      .order('sort_order');
    if (error) setMsg(error.message);
    else setRows(data || []);
  }, [pagePath]);

  useEffect(() => {
    load();
    setForm(blank);
  }, [load]);

  const add = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const sectionKey = (form.section_key || form.title || `section-${Date.now()}`)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const { error } = await supabase
        .from('page_sections')
        .insert({ ...form, page_path: pagePath, section_key: sectionKey })
        .select('id')
        .single();
      if (error) throw error;
      setForm(blank);
      window.dispatchEvent(new Event('jic-content-updated'));
      setMsg('Section added.');
      await load();
    } catch (error) {
      setMsg(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveRow = useCallback(
    async (id, draft, pendingBackground, pendingGallery) => {
      setBusy(true);
      setMsg('');
      try {
        let backgroundImageUrl = draft.background_image_url || '';
        const imageUrls = Array.isArray(draft.image_urls) ? [...draft.image_urls] : [];
        const folder = pagePath.replaceAll('/', '-') || 'home';
        if (pendingBackground)
          backgroundImageUrl = await uploadImage(
            pendingBackground,
            `sections/${folder}/backgrounds`,
          );
        for (const file of pendingGallery || [])
          imageUrls.push(await uploadImage(file, `sections/${folder}/gallery`));
        const payload = {
          title: draft.title || '',
          body: draft.body || '',
          sort_order: Number(draft.sort_order) || 0,
          published: Boolean(draft.published),
          background_image_url: backgroundImageUrl,
          image_urls: imageUrls,
        };
        const { error } = await supabase
          .from('page_sections')
          .update(payload)
          .eq('id', id)
          .select('id')
          .single();
        if (error) throw error;
        window.dispatchEvent(new Event('jic-content-updated'));
        setMsg('Section saved.');
        await load();
      } catch (error) {
        setMsg(error.message);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [pagePath, load],
  );

  const del = async (id) => {
    if (!window.confirm('Delete this section?')) return;
    setBusy(true);
    const { error } = await supabase
      .from('page_sections')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    setMsg(error?.message || 'Section deleted.');
    await load();
    setBusy(false);
  };

  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <h3>Page sections</h3>
        </div>
      </div>
      {msg && <div className="admin-hint">{msg}</div>}
      <form onSubmit={add} className="admin-section-create">
        <label>
          Section name
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          Information
          <textarea
            rows="3"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </label>
        <label>
          Order
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })}
          />
        </label>
        <button disabled={busy || !form.title.trim()} className="admin-button primary">
          <Plus size={16} />
          Add section
        </button>
      </form>
      <div className="admin-section-list">
        {rows.map((row) => (
          <SectionRow key={row.id} row={row} busy={busy} onSave={saveRow} onDelete={del} />
        ))}
      </div>
    </section>
  );
}

function SectionRow({ row, busy, onSave, onDelete }) {
  const [draft, setDraft] = useState(row);
  const [dirty, setDirty] = useState(false);
  const [pendingBackground, setPendingBackground] = useState(null);
  const [pendingBackgroundPreview, setPendingBackgroundPreview] = useState('');
  const [pendingGallery, setPendingGallery] = useState([]);
  const [pendingGalleryPreviews, setPendingGalleryPreviews] = useState([]);
  const previewUrlsRef = useRef(new Set());

  const trackPreview = (file) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  };
  const revokePreview = (url) => {
    if (!url || !previewUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  };
  const clearPreviews = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    setDraft(row);
    setDirty(false);
    setPendingBackground(null);
    setPendingGallery([]);
    setPendingBackgroundPreview('');
    setPendingGalleryPreviews([]);
  }, [row]);

  useEffect(() => () => clearPreviews(), [clearPreviews]);

  const change = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const chooseBackground = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    revokePreview(pendingBackgroundPreview);
    setPendingBackground(file);
    setPendingBackgroundPreview(trackPreview(file));
    setDirty(true);
  };

  const chooseGallery = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    setPendingGallery((current) => [...current, ...files]);
    setPendingGalleryPreviews((current) => [...current, ...files.map(trackPreview)]);
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (!dirty || busy) return;
    await onSave(row.id, draft, pendingBackground, pendingGallery);
    clearPreviews();
    setPendingBackground(null);
    setPendingGallery([]);
    setPendingBackgroundPreview('');
    setPendingGalleryPreviews([]);
    setDirty(false);
  }, [dirty, busy, onSave, row.id, draft, pendingBackground, pendingGallery, clearPreviews]);

  useRegisterAdminSave(save, dirty && !busy, `Save ${draft.title || 'section'}`);

  const images = Array.isArray(draft.image_urls) ? draft.image_urls : [];
  const backgroundPreview = pendingBackgroundPreview || draft.background_image_url;

  return (
    <article className="admin-section-card">
      <div className="admin-section-card-head">
        <strong>{draft.title || draft.section_key}</strong>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button primary"
            disabled={busy || !dirty}
            onClick={() => save().catch(() => {})}
          >
            <Save size={14} />
            {busy ? 'Saving…' : 'Save section'}
          </button>
          <button
            type="button"
            className="admin-button danger"
            disabled={busy}
            onClick={() => onDelete(row.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <label>
        Heading
        <input
          value={draft.title || ''}
          onChange={(event) => change({ title: event.target.value })}
        />
      </label>
      <label>
        Information
        <textarea
          rows="4"
          value={draft.body || ''}
          onChange={(event) => change({ body: event.target.value })}
        />
      </label>
      <div className="admin-section-media">
        <div>
          <span>Background</span>
          {backgroundPreview ? (
            <img src={backgroundPreview} alt="Section background preview" />
          ) : (
            <div className="admin-picture-empty">
              <ImageIcon />
              <small>No background</small>
            </div>
          )}
          <label className="admin-button">
            <Upload size={14} />
            Choose background
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseBackground}
            />
          </label>
          {backgroundPreview && (
            <button
              className="admin-button"
              type="button"
              onClick={() => {
                revokePreview(pendingBackgroundPreview);
                setPendingBackground(null);
                setPendingBackgroundPreview('');
                change({ background_image_url: '' });
              }}
            >
              Remove
            </button>
          )}
        </div>
        <div>
          <span>Gallery pictures</span>
          <div className="admin-section-thumbs">
            {images.map((src, index) => (
              <div key={`${row.id}-${index}`}>
                <img src={src} alt="" />
                <button
                  type="button"
                  onClick={() =>
                    change({ image_urls: images.filter((_, itemIndex) => itemIndex !== index) })
                  }
                >
                  ×
                </button>
              </div>
            ))}
            {pendingGalleryPreviews.map((src, index) => (
              <div key={`pending-${index}`}>
                <img src={src} alt="New gallery preview" />
                <button
                  type="button"
                  onClick={() => {
                    revokePreview(src);
                    setPendingGallery((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    );
                    setPendingGalleryPreviews((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    );
                    setDirty(true);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="admin-button">
            <Upload size={14} />
            Choose pictures
            <input
              hidden
              multiple
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseGallery}
            />
          </label>
        </div>
      </div>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={Boolean(draft.published)}
          onChange={(event) => change({ published: event.target.checked })}
        />
        Published
      </label>
      <small>{dirty ? 'Unsaved changes' : 'Saved'}</small>
    </article>
  );
}
