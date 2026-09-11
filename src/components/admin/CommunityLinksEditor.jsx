import React, { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';

const KEY = 'whatsapp_community_url';

export default function CommunityLinksEditor() {
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dirty = url !== savedUrl;

  useEffect(() => {
    let active = true;
    supabase
      .from('page_content')
      .select('content_value')
      .eq('content_key', KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const value = data?.content_value || '';
        setUrl(value);
        setSavedUrl(value);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async () => {
    if (!dirty || busy) return;
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
      const { error } = await supabase.from('page_content').upsert(
        {
          content_key: KEY,
          content_value: clean,
          content_type: 'text',
          page: '/',
        },
        { onConflict: 'content_key' },
      );
      if (error) throw error;
      setUrl(clean);
      setSavedUrl(clean);
      setMsg('Saved.');
      window.dispatchEvent(new Event('jic-content-updated'));
    } catch (error) {
      setMsg(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [url, dirty, busy]);

  useRegisterAdminSave(save, dirty && !busy, 'Save WhatsApp link');

  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <h3>WhatsApp community</h3>
        </div>
        <WhatsAppIcon />
      </div>
      <label>
        Community invite URL
        <input
          type="url"
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
          disabled={busy || !dirty}
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
