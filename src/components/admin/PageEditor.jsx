import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, Save, Upload, Smartphone, Monitor, ArrowUpRight, Lock, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { EDITABLE_PAGES, pageDefaults, pageKey, overviewPaths } from '@/content/editablePages';
import PageSectionsEditor from '@/components/admin/PageSectionsEditor';
import CommunityLinksEditor from '@/components/admin/CommunityLinksEditor';

export default function PageEditor() {
  const [selected, setSelected] = useState('/');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [revision, setRevision] = useState(0);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingPreview, setPendingPreview] = useState('');
  const previewUrlRef = useRef('');
  const { refreshContent } = useContent();
  const page = EDITABLE_PAGES.find(item => item.path === selected);

  const clearPendingPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPendingPreview('');
    setPendingImage(null);
  }, []);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    clearPendingPreview();
    setLoading(true);
    setError('');
    setMessage('');
    supabase.from('page_content')
      .select('content_value')
      .eq('content_key', pageKey(selected))
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) throw loadError;
        setDraft({ ...pageDefaults(page), ...(data?.content_value ? JSON.parse(data.content_value) : {}) });
        setDirty(false);
      })
      .catch(loadError => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selected, page, clearPendingPreview]);

  useEffect(() => {
    const guard = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  const change = (key, value) => {
    if (key === 'image' && pendingImage) clearPendingPreview();
    setDraft(current => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
  };

  const choose = path => {
    if (busy) return;
    if (dirty && !window.confirm('Discard unsaved changes and open another page?')) return;
    clearPendingPreview();
    setSelected(path);
  };

  const persist = useCallback(async next => {
    const payload = { title: next.title || '', body: next.body || '', image: next.image || '' };
    const { data, error: saveError } = await supabase.from('page_content').upsert({
      content_key: pageKey(selected),
      content_value: JSON.stringify(payload),
      content_type: 'json',
      page: selected,
    }, { onConflict: 'content_key' }).select('content_key');
    if (saveError) throw saveError;
    if (data?.length !== 1) throw new Error('The page was not saved.');
    await refreshContent();
    setDraft(next);
    setDirty(false);
    setRevision(current => current + 1);
  }, [selected, refreshContent]);

  const upload = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
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
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[pendingImage.type];
        const path = `pages/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('site-images').upload(path, pendingImage, { upsert: false });
        if (uploadError) throw uploadError;
        next.image = supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
      }
      if (next.image && !/^https:\/\//i.test(next.image)) throw new Error('Use an HTTPS image URL or upload a picture.');
      await persist(next);
      clearPendingPreview();
      setMessage('Saved.');
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setBusy(false);
    }
  }, [dirty, busy, loading, draft, pendingImage, persist, clearPendingPreview]);

  useRegisterAdminSave(save, dirty && !busy && !loading, 'Save page');

  const removePicture = () => {
    clearPendingPreview();
    change('image', '');
  };

  const visible = EDITABLE_PAGES.filter(item => `${item.name} ${item.group}`.toLowerCase().includes(query.toLowerCase()));
  const shownImage = pendingPreview || draft.image || '';

  return <div className="admin-workspace">
    <div className="admin-heading"><div><span className="admin-eyebrow">WEBSITE</span><h2>Pages & pictures</h2></div><Link className="admin-button" to="/admin/home-tiles">Home tiles <ArrowUpRight size={16}/></Link></div>
    <CommunityLinksEditor/>
    <div className="admin-page-layout">
      <aside className="admin-panel admin-page-picker">
        <label className="admin-search"><Search size={16}/><input aria-label="Find a page" placeholder="Find a page…" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <nav>{[...new Set(visible.map(item => item.group))].map(group => <div key={group}><h4>{group}</h4>{visible.filter(item => item.group === group).map(item => <button disabled={busy} key={item.path} onClick={() => choose(item.path)} className={selected === item.path ? 'selected' : ''}>{item.name}<span>›</span></button>)}</div>)}</nav>
        <small><Lock size={12}/> Navigation is fixed.</small>
      </aside>

      <div className="admin-page-main">
        <section className="admin-panel">
          <div className="admin-heading"><div><h3>{page.name}</h3></div><a href={selected} target="_blank" rel="noreferrer" className="admin-button">Open page <ExternalLink size={15}/></a></div>
          {error && <div role="alert" className="admin-error">{error}</div>}
          {message && <div role="status" className="admin-success">{message}</div>}
          <fieldset disabled={busy || loading}>
            <label>Heading<textarea rows="2" value={draft.title || ''} onChange={event => change('title', event.target.value)}/></label>
            <label>Information<textarea rows="6" value={draft.body || ''} onChange={event => change('body', event.target.value)}/></label>
            <label>Picture URL<input type="url" value={pendingImage ? '' : draft.image || ''} placeholder={pendingImage ? 'Picture selected' : 'https://…'} onChange={event => change('image', event.target.value)}/></label>
            <div className="admin-actions"><label className="admin-button"><Upload size={16}/>Choose picture<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload}/></label>{shownImage && <button type="button" className="admin-button" onClick={removePicture}>Remove picture</button>}</div>
          </fieldset>
          <div className="admin-actions"><button disabled={busy || loading || !dirty} className="admin-button primary" onClick={() => save().catch(() => {})}><Save size={16}/>{busy ? 'Saving…' : 'Save page'}</button><small>{dirty ? 'Unsaved changes' : 'Saved'}</small></div>
        </section>

        <section className="admin-panel"><span className="admin-eyebrow">PREVIEW · {dirty ? 'DRAFT' : 'SAVED'}</span><article className="admin-draft-card">{shownImage ? <img src={shownImage} alt="Page picture preview"/> : <div className="admin-picture-empty"><ImageIcon/><span>No picture</span></div>}<h2>{draft.title}</h2><p>{draft.body || ''}</p></article></section>
        <PageSectionsEditor pagePath={selected}/>
        <section className="admin-panel"><div className="admin-heading"><div><h3>Website preview</h3></div><div className="admin-actions"><button aria-label="Mobile preview" className={`admin-button ${mobile ? 'active' : ''}`} onClick={() => setMobile(true)}><Smartphone size={17}/></button><button aria-label="Desktop preview" className={`admin-button ${!mobile ? 'active' : ''}`} onClick={() => setMobile(false)}><Monitor size={17}/></button></div></div><div className={`admin-site-preview ${mobile ? 'mobile' : ''}`}><iframe key={`${selected}-${revision}`} src={`${selected}${selected.includes('?') ? '&' : '?'}preview=1`} title={`${page.name} website preview`}/></div></section>
      </div>
    </div>
  </div>;
}
