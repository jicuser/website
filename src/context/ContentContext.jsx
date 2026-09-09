/**
 * ContentContext  —  src/context/ContentContext.jsx
 * Provides: editMode, toggleEditMode, getContent, saveContent
 * Content is fetched from Supabase; falls back to the static
 * value passed into EditableText/EditableImage.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const { isAdmin, can } = useAuth();
  const [editMode, setEditMode]   = useState(false);
  const [cache, setCache]         = useState({});   // key → value
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');

  const refreshContent = useCallback(async () => {
    const {data,error}=await supabase.from('page_content').select('content_key, content_value');
    if(error)throw error;
    setCache(Object.fromEntries((data||[]).map(r=>[r.content_key,r.content_value])));
  },[]);
  useEffect(()=>{
    const refresh=()=>refreshContent().catch(console.error);
    refresh();window.addEventListener('focus',refresh);window.addEventListener('jic-content-updated',refresh);
    return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('jic-content-updated',refresh);};
  },[refreshContent]);

  // Turn off edit mode when user logs out
  useEffect(() => {
    if (!isAdmin) setEditMode(false);
  }, [isAdmin]);

  function getContent(key, fallback) {
    return cache[key] ?? fallback;
  }

  const saveContent = useCallback(async (key, value, type = 'text') => {
    if (!can('content')) { setSaveMsg('Error saving'); return; }
    setSaving(true);
    setSaveMsg('');
    try {
      const { error } = await supabase
        .from('page_content')
        .upsert({ content_key: key, content_value: value, content_type: type }, { onConflict: 'content_key' });
      if (error) throw error;
      setCache(prev => ({ ...prev, [key]: value }));
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      console.error('saveContent error:', err);
      setSaveMsg('Error saving');
    } finally {
      setSaving(false);
    }
  }, [can]);

  async function uploadImage(key, file) {
    const ext  = file.name.split('.').pop();
    const path = `${key.replace(/\./g, '/')}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('site-images').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('site-images').getPublicUrl(path);
    await saveContent(key, data.publicUrl, 'image');
    return data.publicUrl;
  }

  return (
    <ContentContext.Provider value={{
      editMode,
      toggleEditMode: () => can('content') && setEditMode(p => !p),
      getContent,
      refreshContent,
      saveContent,
      uploadImage,
      saving,
      saveMsg,
    }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used inside <ContentProvider>');
  return ctx;
}
