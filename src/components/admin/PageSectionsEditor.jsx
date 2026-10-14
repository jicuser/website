import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { EDITABLE_PAGES } from '@/content/editablePages';
import { buildPageNavigator } from '@/lib/pageNavigator';
import { createImageUploader } from '@/lib/imageUpload';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';
import {
  BLOCK_LIMIT,
  GALLERY_LIMIT,
  blockBaseline,
  blocksChanged,
  movePageBlock,
  newPageBlock,
  pageBlocksProblem,
  preparePageBlocks,
} from '@/lib/pageBlocks';
import '@/styles/page-blocks.css';

const destinations = buildPageNavigator(EDITABLE_PAGES);
const pageLabel = (path) => EDITABLE_PAGES.find((page) => page.path === path)?.name || path;
const cleanRows = (rows) =>
  rows.map((row) => ({ ...row, image_urls: Array.isArray(row.image_urls) ? row.image_urls : [] }));

export default function PageSectionsEditor({ pagePath, onSaved }) {
  const { can } = useAuth();
  const id = useId();
  const [model, setModel] = useState({ rows: [], baseline: [], history: [] });
  const modelRef = useRef(model);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(null);
  const inFlight = useRef(false);
  const loadingRef = useRef(true);
  const mounted = useRef(false);
  const request = useRef(0);
  const drag = useRef(null);
  const list = useRef(null);
  const previews = useRef(new Map());
  const uploaded = useRef(new Map());
  const canEdit = can('content');
  const canUpload = can('media');
  const dirty = blocksChanged(model.rows, model.baseline);
  const disabled = busy || loading || !loaded || !canEdit || Boolean(dragging);

  const replaceModel = useCallback((next) => {
    modelRef.current = next;
    setModel(next);
  }, []);

  const clearPreviews = useCallback(() => {
    previews.current.forEach((url) => URL.revokeObjectURL(url));
    previews.current.clear();
    uploaded.current.clear();
  }, []);

  const load = useCallback(
    async (discard = false) => {
      if (inFlight.current || drag.current) return;
      const current = modelRef.current;
      if (blocksChanged(current.rows, current.baseline) && !discard) return;
      const currentRequest = ++request.current;
      loadingRef.current = true;
      setLoading(true);
      setLoadError('');
      try {
        const { data, error: problem } = await supabase
          .from('page_sections')
          .select('*')
          .eq('page_path', pagePath)
          .order('sort_order')
          .order('id');
        if (problem) throw problem;
        if (!Array.isArray(data)) throw new Error('The content blocks could not be loaded.');
        if (!mounted.current || currentRequest !== request.current) return;
        const rows = cleanRows(data);
        replaceModel({ rows, baseline: rows, history: [] });
        clearPreviews();
        setExpanded(null);
        setLoaded(true);
        setError('');
        setMessage('');
      } catch (problem) {
        if (mounted.current && currentRequest === request.current)
          setLoadError(problem.message || 'Could not load content blocks. Try again.');
      } finally {
        if (mounted.current && currentRequest === request.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [pagePath, replaceModel, clearPreviews],
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      request.current += 1;
      drag.current = null;
      clearPreviews();
    };
  }, [load, clearPreviews]);

  useEffect(() => {
    const guard = (event) => {
      if (!dirty && !inFlight.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  useEffect(() => {
    if (!expanded || loading || typeof document === 'undefined') return;
    const editor = document.getElementById?.(`${id}-${expanded}-editor`);
    const heading = editor?.querySelector('input:not([type="file"])');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [expanded, loading, id]);

  const locked = () => disabled || inFlight.current || loadingRef.current || drag.current;
  const commit = (nextRows) => {
    if (locked()) return;
    const current = modelRef.current;
    if (nextRows === current.rows) return;
    replaceModel({
      ...current,
      rows: nextRows,
      history: [...current.history, current.rows].slice(-50),
    });
    setMessage('');
    setError('');
  };
  const change = (blockId, patch) =>
    commit(modelRef.current.rows.map((row) => (row.id === blockId ? { ...row, ...patch } : row)));

  const add = () => {
    if (locked() || modelRef.current.rows.length >= BLOCK_LIMIT) return;
    const row = newPageBlock(pagePath, crypto.randomUUID());
    commit([...modelRef.current.rows, row]);
    setExpanded(row.id);
  };
  const undo = () => {
    if (locked()) return;
    const current = modelRef.current;
    if (!current.history.length) return;
    const rows = current.history[current.history.length - 1];
    replaceModel({ ...current, rows, history: current.history.slice(0, -1) });
    if (!rows.some((row) => row.id === expanded)) setExpanded(null);
    setMessage('Last change undone.');
    setError('');
  };
  const discard = () => {
    if (
      locked() ||
      !dirty ||
      !window.confirm('Discard all unsaved changes to this page’s content blocks?')
    )
      return;
    replaceModel({
      rows: modelRef.current.baseline,
      baseline: modelRef.current.baseline,
      history: [],
    });
    clearPreviews();
    setExpanded(null);
    setError('');
    setMessage('Unsaved block changes discarded.');
  };
  const reload = () => {
    if (busy || loading || drag.current) return;
    if (
      dirty &&
      !window.confirm('Reload saved content blocks? Your unsaved block changes will be discarded.')
    )
      return;
    load(true);
  };
  const remove = (row) => {
    if (locked() || (!row.isNew && !can('delete_content'))) return;
    if (
      !window.confirm(
        `Remove “${row.title || 'Untitled block'}”? The removal takes effect when you save content blocks.`,
      )
    )
      return;
    commit(modelRef.current.rows.filter((item) => item.id !== row.id));
    if (expanded === row.id) setExpanded(null);
  };
  const track = (file) => {
    if (!previews.current.has(file)) previews.current.set(file, URL.createObjectURL(file));
  };
  const chooseBackground = (row, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || locked() || !canUpload) return;
    try {
      validateImage(file);
      track(file);
      change(row.id, { backgroundFile: file });
    } catch (problem) {
      setError(problem.message);
    }
  };
  const chooseGallery = (row, event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length || locked() || !canUpload) return;
    try {
      if (row.image_urls.length + (row.galleryFiles?.length || 0) + files.length > GALLERY_LIMIT)
        throw new Error(`Use up to ${GALLERY_LIMIT} gallery pictures in each block.`);
      files.forEach(validateImage);
      files.forEach(track);
      change(row.id, { galleryFiles: [...(row.galleryFiles || []), ...files] });
    } catch (problem) {
      setError(problem.message);
    }
  };

  const save = useCallback(async () => {
    if (inFlight.current || drag.current || loadingRef.current || loading || !loaded || !canEdit)
      return false;
    const current = modelRef.current;
    if (!blocksChanged(current.rows, current.baseline)) return;
    const problem = pageBlocksProblem(current.rows);
    if (problem) {
      setError(problem);
      throw new Error(problem);
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const prepared = await preparePageBlocks(
        current.rows,
        createImageUploader(supabase),
        uploaded.current,
      );
      const { data, error: saveError } = await supabase.rpc('save_page_sections', {
        p_page_path: pagePath,
        p_expected: blockBaseline(current.baseline),
        p_sections: prepared,
      });
      if (saveError) throw saveError;
      if (!Array.isArray(data))
        throw new Error(
          'The save response was incomplete. Reload saved blocks before trying again.',
        );
      if (!mounted.current) return;
      const rows = cleanRows(data);
      replaceModel({ rows, baseline: rows, history: [] });
      clearPreviews();
      setExpanded(null);
      setMessage('Content blocks saved to the website.');
      window.dispatchEvent(new Event('jic-content-updated'));
      onSaved?.();
    } catch (problem) {
      if (mounted.current)
        setError(problem.message || 'Content blocks were not saved. Your changes are still here.');
      throw problem;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [loading, loaded, canEdit, pagePath, replaceModel, clearPreviews, onSaved]);
  useRegisterAdminSave(save, dirty, 'Save content blocks', busy);

  const finishDrag = (event, cancelled = false) => {
    const session = drag.current;
    if (!session || (event.pointerId != null && event.pointerId !== session.pointerId)) return;
    drag.current = null;
    setDragging(null);
    const current = modelRef.current;
    const reordered = current.rows.some((row, index) => row.id !== session.rows[index]?.id);
    replaceModel(
      cancelled || !reordered
        ? { ...current, rows: session.rows }
        : { ...current, history: [...current.history, session.rows].slice(-50) },
    );
    if (reordered && !cancelled) {
      setMessage('Block order changed. Save content blocks to publish.');
      setError('');
    }
    if (event.currentTarget?.hasPointerCapture?.(session.pointerId))
      event.currentTarget.releasePointerCapture(session.pointerId);
  };
  const startDrag = (row, event) => {
    if (
      locked() ||
      event.button !== 0 ||
      event.isPrimary === false ||
      modelRef.current.rows.length < 2
    )
      return;
    event.preventDefault();
    drag.current = { id: row.id, pointerId: event.pointerId, rows: modelRef.current.rows };
    setDragging(row.id);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      finishDrag(event, true);
    }
  };
  const moveDrag = (event) => {
    const session = drag.current;
    if (!session || event.pointerId !== session.pointerId) return;
    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest?.('[data-page-block-id]'))
      .find((element) => element && list.current?.contains(element));
    if (!target) return;
    const current = modelRef.current;
    const index = current.rows.findIndex((row) => row.id === target.dataset.pageBlockId);
    const rows = movePageBlock(current.rows, session.id, index);
    if (rows !== current.rows) replaceModel({ ...current, rows });
  };

  return (
    <section className="page-blocks" aria-labelledby={`${id}-heading`}>
      <div className="page-blocks__heading">
        <div>
          <h3 id={`${id}-heading`}>Content blocks</h3>
          <p>
            Add text and pictures below this page’s main content. Changes stay in your draft until
            you save.
          </p>
        </div>
        <button
          type="button"
          className="admin-button"
          disabled={disabled || model.rows.length >= BLOCK_LIMIT}
          onClick={add}
        >
          <Plus size={16} /> Add content block
        </button>
      </div>
      <p className="page-blocks__hint">
        These controls manage additional content, not the page’s built-in features. Programme pages
        connect to forms in Programme pages; create and edit forms in Forms & responses.
      </p>
      {!canEdit && <p>You can view these blocks, but your account cannot edit website content.</p>}
      {loading && <p role="status">Loading content blocks…</p>}
      {loadError && (
        <div role="alert" className="admin-error">
          {loadError}
        </div>
      )}
      {error && (
        <div role="alert" className="admin-error">
          {error} Your unsaved block changes are kept.
        </div>
      )}
      {message && (
        <p role="status" className="admin-success">
          {message}
        </p>
      )}
      {(loadError || error) && (
        <button
          type="button"
          className="admin-button"
          disabled={busy || loading || Boolean(dragging)}
          onClick={reload}
        >
          Reload saved blocks
        </button>
      )}

      {loaded && !model.rows.length && (
        <div className="page-blocks__empty">
          No additional content blocks on this page. Add a block to include a heading, information
          or pictures.
        </div>
      )}
      {model.rows.length > 1 && (
        <p className="page-blocks__hint" id={`${id}-reorder`}>
          Drag a block’s handle to change the order, or use its up and down buttons.
        </p>
      )}
      <ol className="page-blocks__list" ref={list}>
        {(dragging && drag.current ? drag.current.rows : model.rows).map((row) => {
          // Keep the captured handle's DOM node in place during a gesture. CSS
          // order shows the draft order; DOM order changes after capture ends.
          const index = model.rows.findIndex((item) => item.id === row.id);
          const open = expanded === row.id;
          const moved = row.page_path !== pagePath;
          const savedBlock = model.baseline.find((item) => item.id === row.id);
          const visibilityPending = row.isNew || row.published !== savedBlock?.published;
          const visibility = visibilityPending
            ? row.published
              ? 'Will show after saving'
              : 'Will be hidden after saving'
            : row.published
              ? 'Visible on website'
              : 'Hidden on website';
          const background = row.backgroundFile
            ? previews.current.get(row.backgroundFile)
            : row.background_image_url;
          const title = row.title || 'Untitled block';
          return (
            <li
              key={row.id}
              data-page-block-id={row.id}
              className={dragging === row.id ? 'is-dragging' : ''}
              style={dragging ? { order: index } : undefined}
            >
              <article className="page-blocks__card">
                <div className="page-blocks__row">
                  <button
                    type="button"
                    className="page-blocks__drag"
                    disabled={busy || loading || !canEdit || model.rows.length < 2}
                    aria-label={`Drag ${title} to reorder`}
                    aria-describedby={model.rows.length > 1 ? `${id}-reorder` : undefined}
                    onPointerDown={(event) => startDrag(row, event)}
                    onPointerMove={moveDrag}
                    onPointerUp={(event) => finishDrag(event)}
                    onPointerCancel={(event) => finishDrag(event, true)}
                    onLostPointerCapture={(event) => finishDrag(event, true)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') finishDrag(event, true);
                      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        commit(
                          movePageBlock(
                            modelRef.current.rows,
                            row.id,
                            index + (event.key === 'ArrowUp' ? -1 : 1),
                          ),
                        );
                      }
                    }}
                  >
                    <GripVertical size={19} />
                  </button>
                  <button
                    type="button"
                    className="page-blocks__toggle"
                    disabled={busy || loading || Boolean(dragging)}
                    aria-expanded={open}
                    aria-controls={open ? `${id}-${row.id}-editor` : undefined}
                    onClick={() => setExpanded(open ? null : row.id)}
                  >
                    <strong>
                      {index + 1}. {title}
                    </strong>
                    <span>
                      {row.isNew ? 'New · ' : ''}
                      {visibility}
                      {moved ? ` · Moving to ${pageLabel(row.page_path)}` : ''}
                    </span>
                    <small>{open ? 'Close editor' : 'Edit block'}</small>
                  </button>
                  <div className="page-blocks__order">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      aria-label={`Move ${title} up`}
                      onClick={() =>
                        commit(movePageBlock(modelRef.current.rows, row.id, index - 1))
                      }
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === model.rows.length - 1}
                      aria-label={`Move ${title} down`}
                      onClick={() =>
                        commit(movePageBlock(modelRef.current.rows, row.id, index + 1))
                      }
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                </div>
                <label className="page-blocks__visibility">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={Boolean(row.published)}
                    onChange={(event) => change(row.id, { published: event.target.checked })}
                  />
                  Show on website
                </label>
                {open && (
                  <fieldset
                    id={`${id}-${row.id}-editor`}
                    className="page-blocks__editor"
                    disabled={disabled}
                  >
                    <legend className="sr-only">Edit {title}</legend>
                    <label>
                      Heading
                      <input
                        value={row.title || ''}
                        maxLength={160}
                        onChange={(event) => change(row.id, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      Information
                      <textarea
                        rows={5}
                        value={row.body || ''}
                        maxLength={12000}
                        onChange={(event) => change(row.id, { body: event.target.value })}
                      />
                    </label>
                    <label>
                      Show this block on page
                      <select
                        value={row.page_path}
                        onChange={(event) => change(row.id, { page_path: event.target.value })}
                      >
                        {destinations.map((section) => (
                          <optgroup key={section.name} label={section.name}>
                            {section.pages.map((page) => (
                              <option key={page.path} value={page.path}>
                                {page.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    {moved && (
                      <p className="page-blocks__hint">
                        This block will leave this page and move to {pageLabel(row.page_path)} when
                        you save. Its visible or hidden setting will stay the same.
                      </p>
                    )}
                    <div className="page-blocks__media">
                      <div>
                        <h4>Background picture</h4>
                        {background ? (
                          <img
                            className="page-blocks__background"
                            src={background}
                            alt={`${title} background preview`}
                          />
                        ) : (
                          <p>No background picture.</p>
                        )}
                        <div className="page-blocks__actions">
                          {canUpload && (
                            <label className="admin-button">
                              <Upload size={15} /> Choose background
                              <input
                                className="sr-only"
                                type="file"
                                accept={IMAGE_ACCEPT}
                                onChange={(event) => chooseBackground(row, event)}
                              />
                            </label>
                          )}
                          {background && (
                            <button
                              type="button"
                              className="admin-button"
                              onClick={() =>
                                change(row.id, { backgroundFile: null, background_image_url: '' })
                              }
                            >
                              Remove background
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4>Gallery pictures</h4>
                        <div className="page-blocks__pictures">
                          {row.image_urls.map((url, pictureIndex) => (
                            <div key={`saved-${pictureIndex}`}>
                              <img src={url} alt={`Gallery picture ${pictureIndex + 1}`} />
                              <button
                                type="button"
                                aria-label={`Remove gallery picture ${pictureIndex + 1}`}
                                onClick={() =>
                                  change(row.id, {
                                    image_urls: row.image_urls.filter(
                                      (_, position) => position !== pictureIndex,
                                    ),
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          {(row.galleryFiles || []).map((file, pictureIndex) => (
                            <div key={`new-${pictureIndex}`}>
                              <img
                                src={previews.current.get(file)}
                                alt={`New gallery picture ${pictureIndex + 1}`}
                              />
                              <button
                                type="button"
                                aria-label={`Remove new gallery picture ${pictureIndex + 1}`}
                                onClick={() =>
                                  change(row.id, {
                                    galleryFiles: row.galleryFiles.filter(
                                      (_, position) => position !== pictureIndex,
                                    ),
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {canUpload && (
                          <label className="admin-button">
                            <Upload size={15} /> Choose gallery pictures
                            <input
                              className="sr-only"
                              multiple
                              type="file"
                              accept={IMAGE_ACCEPT}
                              onChange={(event) => chooseGallery(row, event)}
                            />
                          </label>
                        )}
                        <p className="page-blocks__hint">
                          Up to {GALLERY_LIMIT} JPG, PNG or WebP pictures; each under 8 MB.
                        </p>
                      </div>
                    </div>
                    {(row.isNew || can('delete_content')) && (
                      <button
                        type="button"
                        className="admin-button danger"
                        onClick={() => remove(row)}
                      >
                        <Trash2 size={16} /> Remove content block
                      </button>
                    )}
                  </fieldset>
                )}
              </article>
            </li>
          );
        })}
      </ol>
      {loaded && (
        <div className="page-blocks__save">
          <div className="page-blocks__actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={disabled || !dirty}
              onClick={() => save().catch(() => {})}
            >
              <Save size={16} />
              {busy ? 'Saving content blocks…' : 'Save content blocks'}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={disabled || !model.history.length}
              onClick={undo}
            >
              <RotateCcw size={16} /> Undo last change
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={disabled || !dirty}
              onClick={discard}
            >
              Discard block changes
            </button>
          </div>
          <p role="status">
            {busy
              ? 'Saving all block changes together…'
              : dirty
                ? 'Unsaved block changes · Nothing changes on the website until you save.'
                : 'No unsaved block changes.'}
          </p>
        </div>
      )}
    </section>
  );
}
