import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const AdminSaveContext = createContext(null);

export function AdminSaveProvider({ children }) {
  const handlerRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('Save to database');
  const [status, setStatus] = useState('');

  const register = useCallback((handler, options = {}) => {
    handlerRef.current = handler || null;
    setDirty(Boolean(options.dirty));
    setLabel(options.label || 'Save to database');
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
    };
  }, []);

  const updateState = useCallback((next = {}) => {
    if (Object.prototype.hasOwnProperty.call(next, 'dirty')) setDirty(Boolean(next.dirty));
    if (next.label) setLabel(next.label);
  }, []);

  const saveCurrent = useCallback(async () => {
    if (!handlerRef.current || !dirty || saving) return false;
    setSaving(true);
    setStatus('');
    try {
      await handlerRef.current();
      setDirty(false);
      setStatus('Saved');
      window.setTimeout(() => setStatus(''), 1800);
      return true;
    } catch (error) {
      setStatus(error?.message || 'Save failed');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [dirty, saving]);

  const value = useMemo(() => ({
    register,
    updateState,
    saveCurrent,
    dirty,
    saving,
    label,
    status,
  }), [register, updateState, saveCurrent, dirty, saving, label, status]);

  return <AdminSaveContext.Provider value={value}>{children}</AdminSaveContext.Provider>;
}

export function useAdminSave() {
  const context = useContext(AdminSaveContext);
  if (!context) throw new Error('useAdminSave must be used inside <AdminSaveProvider>');
  return context;
}
