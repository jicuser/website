import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { COMMUNITY_SERVICES } from '@/content/communityServices';
import { pageName } from '@/content/pageDirectory';
import {
  DEFAULT_SITE_DESIGN,
  DESIGN_ICONS,
  DESIGN_PAGES,
  normaliseSiteDesign,
  SITE_DESIGN_KEY,
} from '@/lib/siteDesign';
import '@/styles/page-editor.css';
const palettes = [
  ['navy-gold', 'Navy & gold'],
  ['forest', 'Forest'],
  ['slate', 'Slate'],
];
export default function WebsiteAppearance() {
  const [draft, setDraft] = useState(DEFAULT_SITE_DESIGN),
    [baseline, setBaseline] = useState(DEFAULT_SITE_DESIGN),
    [published, setPublished] = useState(DEFAULT_SITE_DESIGN);
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [scope, setScope] = useState('global'),
    [path, setPath] = useState('/services'),
    [device, setDevice] = useState('phone'),
    [dark, setDark] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const frame = useRef(null),
    pending = useRef(false);
  const { refreshContent } = useContent();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline),
    unpublished = JSON.stringify(draft) !== JSON.stringify(published);
  useEffect(() => {
    let active = true;
    setError('');
    supabase
      .from('website_design')
      .select('draft,published,revision')
      .eq('id', true)
      .maybeSingle()
      .then(({ data, error: problem }) => {
        if (!active) return;
        if (problem) {
          setError(problem.message);
          return;
        }
        const next = normaliseSiteDesign(data?.draft);
        setDraft(next);
        setBaseline(next);
        setPublished(normaliseSiteDesign(data?.published));
        setRevision(data?.revision || 0);
        setLoading(false);
      })
      .catch((problem) => active && setError(problem.message));
    return () => {
      active = false;
    };
  }, [loadAttempt]);
  const postPreview = useCallback(
    () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'jic-page-preview',
          path,
          content: { [SITE_DESIGN_KEY]: JSON.stringify(draft) },
          appearance: dark ? 'dark' : 'light',
        },
        window.location.origin,
      ),
    [path, draft, dark],
  );
  useEffect(() => {
    postPreview();
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
  useEffect(() => {
    const guard = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const save = async (publish = false) => {
    if (pending.current || loading) return false;
    pending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = normaliseSiteDesign(draft);
      const { data, error: problem } = await supabase.rpc('save_website_design', {
        p_design: next,
        p_expected_revision: revision,
        p_publish: publish,
      });
      if (problem) throw problem;
      setRevision(data);
      setDraft(next);
      setBaseline(next);
      if (publish) setPublished(next);
      await refreshContent();
      setMessage(
        publish ? 'Published to the website.' : 'Draft saved. The live website is unchanged.',
      );
      return true;
    } catch (problem) {
      setError(problem.message);
      throw problem;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  useRegisterAdminSave(() => save(false), dirty && !loading, 'Save draft', busy);
  const value = scope === 'global' ? draft : draft.pages[scope] || {};
  const update = (patch) => {
    setMessage('');
    setDraft((current) =>
      scope === 'global'
        ? { ...current, ...patch }
        : {
            ...current,
            pages: { ...current.pages, [scope]: { ...current.pages[scope], ...patch } },
          },
    );
  };
  return (
    <div className="admin-workspace website-appearance">
      <div className="admin-heading">
        <div>
          <h2>Website appearance</h2>
          <p>
            Choose a scope, preview it, save a draft or publish. These settings apply to the
            website; TV layouts have their own controls.
          </p>
        </div>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {loading
            ? 'Could not load appearance settings. Try again or contact the site administrator.'
            : error}
          {loading && (
            <button
              type="button"
              className="admin-button"
              onClick={() => setLoadAttempt((value) => value + 1)}
            >
              Try again
            </button>
          )}
        </p>
      )}
      {message && (
        <p className="admin-success" role="status">
          {message}
        </p>
      )}
      <div className="appearance-workspace">
        <section className="admin-panel">
          <fieldset disabled={busy || loading}>
            <label>
              Edit scope
              <select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value);
                  if (event.target.value !== 'global') setPath(event.target.value);
                }}
              >
                <option value="global">Whole website</option>
                {DESIGN_PAGES.map((page) => (
                  <option key={page} value={page}>
                    {pageName(page) || page} only
                  </option>
                ))}
              </select>
            </label>
            <label>
              Colour palette
              <select
                value={value.palette || ''}
                onChange={(event) => update({ palette: event.target.value })}
              >
                {scope !== 'global' && <option value="">Use whole-website palette</option>}
                {palettes.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Overview layout
              <select
                value={value.layout || ''}
                onChange={(event) => update({ layout: event.target.value })}
              >
                {scope !== 'global' && <option value="">Use whole-website layout</option>}
                <option value="compact">Compact grouped tiles</option>
                <option value="list">List rows</option>
              </select>
            </label>
            <p>
              Layout changes apply to Home shortcuts, Hub services and the Worship overview. Reading
              text, forms and timetables keep their own layouts.
            </p>
            {scope !== 'global' && (
              <button
                type="button"
                className="admin-button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    pages: Object.fromEntries(
                      Object.entries(current.pages).filter(([key]) => key !== scope),
                    ),
                  }))
                }
              >
                Reset this page to website settings
              </button>
            )}
            <details>
              <summary>Service icons · shared by Home and Hub</summary>
              {COMMUNITY_SERVICES.map((service) => (
                <label key={service.id}>
                  {service.title}
                  <select
                    value={draft.icons[service.id] || service.icon}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        icons: { ...current.icons, [service.id]: event.target.value },
                      }))
                    }
                  >
                    {DESIGN_ICONS.map((icon) => (
                      <option key={icon}>{icon}</option>
                    ))}
                  </select>
                </label>
              ))}
            </details>
            <div className="admin-actions">
              <button
                className="admin-button"
                type="button"
                disabled={!dirty}
                onClick={() => setDraft(baseline)}
              >
                Undo unsaved changes
              </button>
              <button
                className="admin-button"
                type="button"
                disabled={!dirty}
                onClick={() => save(false).catch(() => {})}
              >
                Save draft
              </button>
              <button
                className="admin-button primary"
                type="button"
                disabled={!unpublished}
                onClick={() => save(true).catch(() => {})}
              >
                {busy ? 'Saving…' : 'Publish changes'}
              </button>
            </div>
            <p role="status">
              {loading
                ? error
                  ? 'Settings unavailable'
                  : 'Loading settings…'
                : dirty
                  ? 'Unsaved preview changes'
                  : unpublished
                    ? 'Saved draft · not published'
                    : 'Published settings'}{' '}
              · revision {revision}
            </p>
          </fieldset>
        </section>
        <section className="admin-panel appearance-preview">
          <div className="appearance-preview-controls">
            <label>
              Preview page
              <select value={path} onChange={(e) => setPath(e.target.value)}>
                {DESIGN_PAGES.map((page) => (
                  <option key={page} value={page}>
                    {pageName(page) || page}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Device
              <select value={device} onChange={(e) => setDevice(e.target.value)}>
                <option value="phone">Phone</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                role="switch"
                checked={dark}
                onChange={(e) => setDark(e.target.checked)}
              />
              Dark preview
            </label>
          </div>
          <div className={`appearance-frame ${device}`}>
            <iframe
              ref={frame}
              key={path}
              src={`${path}?preview=1`}
              title="Website appearance preview"
              onLoad={postPreview}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
