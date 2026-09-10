import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AdminSaveContext = createContext(null);

export function AdminSaveProvider({ children }) {
  const entriesRef = useRef(new Map());
  const [summary, setSummary] = useState({ dirtyCount: 0, label: 'Save to database' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const refreshSummary = useCallback(() => {
    const dirtyEntries = [...entriesRef.current.values()].filter(entry => entry.dirty);
    setSummary({
      dirtyCount: dirtyEntries.length,
      label: dirtyEntries.length === 1 ? dirtyEntries[0].label : dirtyEntries.length > 1 ? 'Save all changes' : 'Save to database',
    });
  }, []);

  const register = useCallback((id, handler, options = {}) => {
    entriesRef.current.set(id, {
      handler,
      dirty: Boolean(options.dirty),
      label: options.label || 'Save to database',
    });
    refreshSummary();
    return () => {
      entriesRef.current.delete(id);
      refreshSummary();
    };
  }, [refreshSummary]);

  const updateState = useCallback((id, next = {}) => {
    const current = entriesRef.current.get(id);
    if (!current) return;
    entriesRef.current.set(id, {
      ...current,
      ...(Object.prototype.hasOwnProperty.call(next, 'dirty') ? { dirty: Boolean(next.dirty) } : {}),
      ...(next.label ? { label: next.label } : {}),
    });
    refreshSummary();
  }, [refreshSummary]);

  const saveCurrent = useCallback(async () => {
    if (saving) return false;
    const dirtyEntries = [...entriesRef.current.entries()].filter(([, entry]) => entry.dirty);
    if (!dirtyEntries.length) return false;

    setSaving(true);
    setStatus('');
    try {
      for (const [id, entry] of dirtyEntries) {
        await entry.handler();
        const latest = entriesRef.current.get(id);
        if (latest) entriesRef.current.set(id, { ...latest, dirty: false });
      }
      refreshSummary();
      setStatus('Saved');
      window.setTimeout(() => setStatus(''), 1800);
      return true;
    } catch (error) {
      refreshSummary();
      setStatus(error?.message || 'Save failed');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [saving, refreshSummary]);

  const value = useMemo(() => ({
    register,
    updateState,
    saveCurrent,
    dirty: summary.dirtyCount > 0,
    dirtyCount: summary.dirtyCount,
    saving,
    label: summary.label,
    status,
  }), [register, updateState, saveCurrent, summary, saving, status]);

  return <AdminSaveContext.Provider value={value}>{children}</AdminSaveContext.Provider>;
}

export function useAdminSave() {
  const context = useContext(AdminSaveContext);
  if (!context) throw new Error('useAdminSave must be used inside <AdminSaveProvider>');
  return context;
}

export function useRegisterAdminSave(save, dirty, label = 'Save to database') {
  const { register, updateState } = useAdminSave();
  const idRef = useRef(Symbol(label));
  const saveRef = useRef(save);
  saveRef.current = save;

  const invokeLatest = useCallback(() => saveRef.current(), []);

  useEffect(() => register(idRef.current, invokeLatest, { dirty, label }), [register, invokeLatest]);
  useEffect(() => updateState(idRef.current, { dirty, label }), [updateState, dirty, label]);
}
