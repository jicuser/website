import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

const ADMIN_ROLES = new Set(['super_admin', 'admin', 'content_editor', 'events_manager', 'teacher']);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);

  const loadProfile = useCallback(async (authUser) => {
    const request = ++profileRequest.current;
    if (!authUser) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('id', authUser.id)
      .maybeSingle();
    if (request !== profileRequest.current) return error ? null : data ?? null;
    if (error) {
      console.error('Unable to load admin profile:', error);
      setProfile(null);
      return null;
    }
    setProfile(data ?? null);
    return data ?? null;
  }, []);

  useEffect(() => {
    let mounted = true;
    let authEventSeen = false;
    let timer;
    const applySession = (session) => {
      if (!mounted) return;
      const authUser = session?.user ?? null;
      ++profileRequest.current;
      setUser(authUser);
      setProfile(null);
      setLoading(Boolean(authUser));
      window.clearTimeout(timer);
      // Supabase calls must run outside onAuthStateChange's auth lock.
      if (authUser) timer = window.setTimeout(() => {
        if (!mounted) return;
        loadProfile(authUser).catch(() => setProfile(null)).finally(() => {
          if (mounted) setLoading(false);
        });
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      applySession(session);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!authEventSeen) applySession(error ? null : data?.session);
    }).catch(() => { if (!authEventSeen) applySession(null); });
    return () => {
      mounted = false;
      ++profileRequest.current;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email, password, auditName = '') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const p = await loadProfile(data.user);
    if (!p?.is_active || !ADMIN_ROLES.has(p?.role)) {
      await supabase.auth.signOut();
      throw new Error('This account does not have JIC administration access.');
    }
    const cleanName = auditName.trim();
    if (cleanName) {
      const { error: nameError } = await supabase.auth.updateUser({ data: { audit_name: cleanName } });
      if (nameError) console.warn('Unable to save audit display name:', nameError);
    }
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    ++profileRequest.current;
    setUser(null);
    setProfile(null);
  }

  const role = profile?.role ?? 'viewer';
  const isAdmin = Boolean(user && profile?.is_active && ADMIN_ROLES.has(role));
  const isSuperAdmin = Boolean(isAdmin && role === 'super_admin');

  const can = useCallback((permission) => {
    if (!isAdmin) return false;
    if (role === 'super_admin') return true;
    const matrix = {
      dashboard: ['admin', 'content_editor', 'events_manager', 'teacher'],
      content: ['admin', 'content_editor'],
      events: ['admin', 'content_editor', 'events_manager'],
      prayer_times: ['admin'],
      announcements: ['admin', 'content_editor', 'events_manager', 'teacher'],
      livestream: ['admin', 'content_editor'],
      team: ['admin', 'content_editor'],
      media: ['admin', 'content_editor', 'events_manager', 'teacher'],
      users: [],
      audit: ['admin'],
    };
    return matrix[permission]?.includes(role) ?? false;
  }, [isAdmin, role]);

  const value = useMemo(() => ({
    user, profile, role, isAdmin, isSuperAdmin, loading, signIn, signOut, can, refreshProfile: () => loadProfile(user),
  }), [user, profile, role, isAdmin, isSuperAdmin, loading, can, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
