import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';

const KEY = 'whatsapp_community_url';

export default function CommunityLinksEditor() {
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const loadRequest = useRef(null);
  const dirty = url !== savedUrl;

  const load = useCallback(async () => {
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    setLoading(true);
    setReady(false);
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('content_key', KEY)
        .maybeSingle()
        .abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error) throw error;
      const value = data?.content_value || '';
      setUrl(value);
      setSavedUrl(value);
      setReady(true);
    } catch {
      if (!controller.signal.aborted)
        setLoadError('The community link could not be loaded. Retry before making changes.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => loadRequest.current?.abort();
  }, [load]);

  const save = useCallback(async () => {
    if (!ready || !dirty || busy) return false;
    setBusy(true);
    setMsg('');
    try {
      const clean = url.trim();
      if (clean) {
        const parsed = new URL(clean);
        if (
          !['chat.whatsapp.com', 'wa.me', 'www.whatsapp.com', 'whatsapp.com'].includes(
            parsed.hostname,
          )
        ) {
          throw new Error('Use a valid WhatsApp invite link.');
        }
      }
      const { data, error } = await supabase
        .from('page_content')
        .upsert(
          {
            content_key: KEY,
            content_value: clean,
            content_type: 'text',
            page: '/',
          },
          { onConflict: 'content_key' },
        )
        .select('content_key');
      if (error) throw error;
      if (data?.length !== 1) throw new Error('The community link was not saved.');
      setUrl((current) => (current === url ? clean : current));
      setSavedUrl(clean);
      setMsg('Saved.');
      window.dispatchEvent(new Event('jic-content-updated'));
    } catch (error) {
      setMsg(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [url, dirty, busy, ready]);

  useRegisterAdminSave(save, dirty && ready, 'Save WhatsApp link', busy);

  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <h3>WhatsApp community</h3>
        </div>
        <WhatsAppIcon />
      </div>
      {loading && <p role="status">Loading community link…</p>}
      {loadError && (
        <div role="alert">
          <p>{loadError}</p>
          <button type="button" className="admin-button" onClick={load} disabled={loading}>
            Retry link
          </button>
        </div>
      )}
      <label>
        Community invite URL
        <input
          type="url"
          disabled={!ready}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setMsg('');
          }}
          placeholder="https://chat.whatsapp.com/..."
        />
      </label>
      <div className="admin-actions">
        <button
          type="button"
          onClick={() => save().catch(() => {})}
          disabled={!ready || busy || !dirty}
          className="admin-button primary"
        >
          <Save size={16} />
          {busy ? 'Saving…' : 'Save link'}
        </button>
        {msg && <small>{msg}</small>}
      </div>
    </section>
  );
}
