/**
 * Shared editable-content state. Public content is loaded once and refreshed
 * only after an explicit content update, rather than on every browser focus.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { validateImage } from '@/lib/images';
import { useAuth } from '@/context/AuthContext';

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const { isAdmin, can } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [cache, setCache] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const refreshContent = useCallback(async () => {
    const { data, error } = await supabase.from('page_content').select('content_key, content_value');
    if (error) throw error;
    setCache(Object.fromEntries((data || []).map(row => [row.content_key, row.content_value])));
  }, []);

  useEffect(() => {
    const refresh = () => refreshContent().catch(console.error);
    refresh();
    window.addEventListener('jic-content-updated', refresh);
    return () => window.removeEventListener('jic-content-updated', refresh);
  }, [refreshContent]);

  useEffect(() => {
    if (!isAdmin) setEditMode(false);
  }, [isAdmin]);

  function getContent(key, fallback) {
    return cache[key] ?? fallback;
  }

  const saveContent = useCallback(async (key, value, type = 'text') => {
    if (!can('content')) throw new Error('You do not have permission to edit website content.');
    setSaving(true);
    setSaveMsg('');
    try {
      const { data, error } = await supabase
        .from('page_content')
        .upsert(
          { content_key: key, content_value: value, content_type: type },
          { onConflict: 'content_key' }
        )
        .select('content_key');
      if (error) throw error;
      if (data?.length !== 1) throw new Error('The change was not saved. Please try again.');
      setCache(previous => ({ ...previous, [key]: value }));
      setSaveMsg('Saved');
      window.setTimeout(() => setSaveMsg(''), 2000);
    } catch (error) {
      console.error('saveContent error:', error);
      setSaveMsg('Error saving');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [can]);

  async function uploadImage(key, file) {
    if (!can('content')) throw new Error('You do not have permission to replace pictures.');
    const ext = validateImage(file);
    const path = `${key.replace(/\./g, '/')}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('site-images').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('site-images').getPublicUrl(path);
    await saveContent(key, data.publicUrl, 'image');
    return data.publicUrl;
  }

  return (
    <ContentContext.Provider value={{
      editMode,
      toggleEditMode: () => can('content') && setEditMode(previous => !previous),
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
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside <ContentProvider>');
  return context;
}
