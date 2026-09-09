import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

const ADMIN_ROLES = new Set(['super_admin', 'admin', 'content_editor', 'events_manager', 'teacher']);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('id', authUser.id)
      .maybeSingle();
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const authUser = session?.user ?? null;
      setUser(authUser);
      await loadProfile(authUser);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      await loadProfile(authUser);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const p = await loadProfile(data.user);
    if (!p?.is_active || !ADMIN_ROLES.has(p?.role)) {
      await supabase.auth.signOut();
      throw new Error('This account does not have JIC administration access.');
    }
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
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
