import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Save, Upload, Smartphone, Monitor, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { createImageUploader } from '@/lib/imageUpload';
import { useContent } from '@/context/ContentContext';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import {
  EDITABLE_PAGES,
  editablePagePath,
  pageDefaults,
  pageKey,
  supplementalContentPaths,
} from '@/content/editablePages';
import PageSectionsEditor from '@/components/admin/PageSectionsEditor';
import CommunityLinksEditor from '@/components/admin/CommunityLinksEditor';
import HeaderContentEditor from '@/components/admin/HeaderContentEditor';
import PageNavigator from '@/components/admin/PageNavigator';
import HallDetailsEditor from '@/features/content/HallDetailsEditor';
import '@/styles/page-editor.css';

export default function PageEditor({
  initialPath = '/',
  inline = false,
  workspace = false,
  onSelectPage,
}) {
  const [selected, setSelected] = useState(() => editablePagePath(initialPath));
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [revision, setRevision] = useState(0);
  const [previewPane, setPreviewPane] = useState(false);
  const [sectionPreview, setSectionPreview] = useState(null);
  const [extraContent, setExtraContent] = useState({});
  const frame = useRef(null);
  const previewBox = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(600);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingPreview, setPendingPreview] = useState('');
  const previewUrlRef = useRef('');
  const { refreshContent } = useContent();
  const { saving: workspaceSaving } = useAdminSave();
  const page = EDITABLE_PAGES.find((item) => item.path === selected);
  const additionalContent = supplementalContentPaths.has(selected);
  const shownImage = pendingPreview || draft.image || '';
  const postPreview = useCallback(() => {
    if (loading) return;
    frame.current?.contentWindow?.postMessage(
      {
        type: 'jic-page-preview',
        path: selected,
        content: {
          [pageKey(selected)]: JSON.stringify({ ...draft, image: shownImage }),
          ...extraContent,
        },
        sections: sectionPreview,
      },
      window.location.origin,
    );
  }, [loading, selected, draft, shownImage, extraContent, sectionPreview]);
  useEffect(() => {
    const timer = window.setTimeout(postPreview, 120);
    return () => window.clearTimeout(timer);
  }, [postPreview]);
  useEffect(() => {
    const ready = (event) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'jic-page-preview-ready'
      )
        postPreview();
    };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [postPreview]);
  const previewHall = useCallback(
    (value) => setExtraContent({ hall_details: JSON.stringify(value) }),
    [],
  );
  useEffect(() => {
    if (!previewBox.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setPreviewWidth(entry.contentRect.width);
    });
    observer.observe(previewBox.current);
    return () => observer.disconnect();
  }, []);

  const clearPendingPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPendingPreview('');
    setPendingImage(null);
  }, []);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    clearPendingPreview();
    setLoading(true);
    setError('');
    setMessage('');
    supabase
      .from('page_content')
      .select('content_value')
      .eq('content_key', pageKey(selected))
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) throw loadError;
        setDraft({
          ...pageDefaults(page),
          ...(data?.content_value ? JSON.parse(data.content_value) : {}),
        });
        setDirty(false);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selected, page, clearPendingPreview]);

  useEffect(() => {
    const guard = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  const change = (key, value) => {
    if (key === 'image' && pendingImage) clearPendingPreview();
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
  };

  const choose = (path) => {
    if (busy || workspaceSaving) return;
    path = editablePagePath(path);
    if (onSelectPage) {
      onSelectPage(path);
      return;
    }
    if (dirty && !window.confirm('Discard unsaved changes and open another page?')) return;
    clearPendingPreview();
    setSelected(path);
  };

  const persist = useCallback(
    async (next) => {
      const payload = { title: next.title || '', body: next.body || '', image: next.image || '' };
      const { data, error: saveError } = await supabase
        .from('page_content')
        .upsert(
          {
            content_key: pageKey(selected),
            content_value: JSON.stringify(payload),
            content_type: 'json',
            page: selected,
          },
          { onConflict: 'content_key' },
        )
        .select('content_key');
      if (saveError) throw saveError;
      if (data?.length !== 1) throw new Error('The page was not saved.');
      await refreshContent();
      setDraft(next);
      setDirty(false);
      setRevision((current) => current + 1);
    },
    [selected, refreshContent],
  );

  const upload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      ) {
        throw new Error('Choose a JPG, PNG or WebP under 8 MB.');
      }
      clearPendingPreview();
      const preview = URL.createObjectURL(file);
      previewUrlRef.current = preview;
      setPendingPreview(preview);
      setPendingImage(file);
      setDirty(true);
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const save = useCallback(async () => {
    if (!dirty || busy || loading) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      let next = { ...draft };
      if (pendingImage) {
        next.image = await createImageUploader(supabase)(pendingImage, 'pages');
      }
      if (next.image && !/^https:\/\//i.test(next.image))
        throw new Error('Use an HTTPS image URL or upload a picture.');
      await persist(next);
      clearPendingPreview();
      setMessage('Saved to the website.');
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setBusy(false);
    }
  }, [dirty, busy, loading, draft, pendingImage, persist, clearPendingPreview]);

  useRegisterAdminSave(save, dirty && !loading, 'Save page', busy);

  const removePicture = () => {
    clearPendingPreview();
    change('image', '');
  };

  return (
    <div className="admin-workspace">
      {!workspace && (
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">WEBSITE</span>
            <h2>Edit website pages</h2>
          </div>
          <Link className="admin-button" to="/admin/home-tiles">
            Home tiles <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {!inline && !workspace && (
        <details className="admin-panel">
          <summary>Site-wide text & community links</summary>
          <HeaderContentEditor />
          <CommunityLinksEditor />
        </details>
      )}
      <div className={inline || workspace ? 'admin-inline-page' : 'admin-page-layout'}>
        {!inline && !workspace && (
          <PageNavigator
            selected={selected}
            onSelectPage={choose}
            disabled={busy || workspaceSaving}
          />
        )}

        <div className={`page-editor-layout ${previewPane ? 'is-preview-pane' : ''}`}>
          <nav className="page-editor-mobile-tabs" aria-label="Editor view">
            <button
              className="admin-button"
              aria-pressed={!previewPane}
              onClick={() => setPreviewPane(false)}
            >
              Edit page
            </button>
            <button
              className="admin-button"
              aria-pressed={previewPane}
              onClick={() => setPreviewPane(true)}
            >
              Live preview
            </button>
          </nav>
          <div className="page-editor-controls">
            <section className="admin-panel">
              <div className="admin-heading">
                <div>
                  <h3>{page.name}</h3>
                  <p>
                    {additionalContent
                      ? 'Add information below this page’s main content. Save to publish it on the website.'
                      : 'Edit this page’s introduction. Save to publish your changes on the website.'}
                  </p>
                </div>
                <a href={selected} target="_blank" rel="noreferrer" className="admin-button">
                  Open page <ExternalLink size={15} />
                </a>
              </div>
              {error && (
                <div role="alert" className="admin-error">
                  {error}
                </div>
              )}
              {message && (
                <div role="status" className="admin-success">
                  {message}
                </div>
              )}
              <fieldset disabled={busy || loading}>
                <label>
                  {additionalContent ? 'Additional heading' : 'Page heading'}
                  <textarea
                    rows="2"
                    value={draft.title || ''}
                    onChange={(event) => change('title', event.target.value)}
                  />
                </label>
                <label>
                  {additionalContent ? 'Additional information' : 'Introduction'}
                  <textarea
                    rows="6"
                    value={draft.body || ''}
                    onChange={(event) => change('body', event.target.value)}
                  />
                </label>
                <label>
                  Picture URL
                  <input
                    type="url"
                    value={pendingImage ? '' : draft.image || ''}
                    placeholder={pendingImage ? 'Picture selected' : 'https://…'}
                    onChange={(event) => change('image', event.target.value)}
                  />
                </label>
                <div className="admin-actions">
                  <label className="admin-button">
                    <Upload size={16} />
                    Choose picture
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={upload}
                    />
                  </label>
                  {shownImage && (
                    <button type="button" className="admin-button" onClick={removePicture}>
                      Remove picture
                    </button>
                  )}
                </div>
              </fieldset>
              <div className="admin-actions">
                <button
                  disabled={busy || loading || !dirty}
                  className="admin-button primary"
                  onClick={() => save().catch(() => {})}
                >
                  <Save size={16} />
                  {busy ? 'Saving…' : 'Save page'}
                </button>
                <small>
                  {loading
                    ? 'Loading…'
                    : error
                      ? 'Check the error above'
                      : dirty
                        ? 'Unsaved changes'
                        : 'Up to date'}
                </small>
              </div>
            </section>

            {selected === '/services/hall-booking' && <HallDetailsEditor onPreview={previewHall} />}
            <PageSectionsEditor
              key={selected}
              pagePath={selected}
              onSaved={() => setRevision((current) => current + 1)}
              onPreview={setSectionPreview}
            />
          </div>
          <aside className="page-editor-preview admin-panel" aria-label="Live website preview">
            <div className="admin-heading">
              <div>
                <h3>Live preview</h3>
                <p>Draft changes appear here. Save to publish.</p>
              </div>
              <div className="admin-actions">
                <button
                  aria-label="Mobile preview"
                  className={`admin-button ${mobile ? 'active' : ''}`}
                  onClick={() => setMobile(true)}
                  aria-pressed={mobile}
                >
                  <Smartphone size={17} />
                </button>
                <button
                  aria-label="Desktop preview"
                  className={`admin-button ${!mobile ? 'active' : ''}`}
                  onClick={() => setMobile(false)}
                  aria-pressed={!mobile}
                >
                  <Monitor size={17} />
                </button>
              </div>
            </div>
            <div ref={previewBox} className={`admin-site-preview ${mobile ? 'mobile' : ''}`}>
              <iframe
                ref={frame}
                onLoad={postPreview}
                key={`${selected}-${revision}`}
                src={`${selected}${selected.includes('?') ? '&' : '?'}preview=1`}
                title={`${page.name} website preview`}
                style={
                  mobile
                    ? undefined
                    : {
                        width: 1200,
                        height: `${120000 / previewWidth}%`,
                        transform: `scale(${previewWidth / 1200})`,
                        transformOrigin: 'top left',
                      }
                }
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
