import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);
const ADMIN_ROLES = new Set(['super_admin', 'admin', 'content_editor', 'events_manager', 'teacher']);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const signInInProgress = useRef(false);
  const currentUserId = useRef(null);

  const loadProfile = useCallback(async (authUser) => {
    const request = ++profileRequest.current;
    if (!authUser) {
      setProfile(null);
      return null;
    }

    const profileQuery = supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('id', authUser.id)
      .maybeSingle();

    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('Admin profile request timed out.')), 10000);
    });

    try {
      const { data, error } = await Promise.race([profileQuery, timeout]);
      if (request !== profileRequest.current) return error ? null : data ?? null;
      if (error) throw error;
      setProfile(data ?? null);
      return data ?? null;
    } catch (error) {
      if (request === profileRequest.current) {
        console.error('Unable to load admin profile:', error);
        setProfile(null);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const finishSignedOut = () => {
      ++profileRequest.current;
      currentUserId.current = null;
      setUser(null);
      setProfile(null);
      setLoading(false);
    };

    const establishSession = async (session) => {
      if (!mounted) return;
      const authUser = session?.user ?? null;
      if (!authUser) {
        finishSignedOut();
        return;
      }

      currentUserId.current = authUser.id;
      setUser(authUser);
      setLoading(true);
      await loadProfile(authUser);
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (!mounted || initialized) return;
        initialized = true;
        if (error) {
          finishSignedOut();
          return;
        }
        await establishSession(data?.session ?? null);
      })
      .catch(() => {
        if (!mounted || initialized) return;
        initialized = true;
        finishSignedOut();
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const authUser = session?.user ?? null;

      if (event === 'SIGNED_OUT' || !authUser) {
        initialized = true;
        finishSignedOut();
        return;
      }

      // Token/session refreshes must never tear down the Admin UI.
      // Keep the already-loaded profile and update only the auth user object.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        currentUserId.current = authUser.id;
        setUser(authUser);
        return;
      }

      // signIn() validates/loads the profile itself. Do not duplicate that work.
      if (signInInProgress.current) {
        currentUserId.current = authUser.id;
        setUser(authUser);
        return;
      }

      // Ignore duplicate SIGNED_IN / INITIAL_SESSION events for the same active user.
      if (currentUserId.current === authUser.id && profile) {
        setUser(authUser);
        setLoading(false);
        initialized = true;
        return;
      }

      initialized = true;
      establishSession(session).catch(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      ++profileRequest.current;
      subscription.unsubscribe();
    };
  }, [loadProfile, profile]);

  async function signIn(email, password, auditName = '') {
    signInInProgress.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      currentUserId.current = data.user.id;
      setUser(data.user);
      const p = await loadProfile(data.user);
      if (!p?.is_active || !ADMIN_ROLES.has(p?.role)) {
        signInInProgress.current = false;
        await supabase.auth.signOut();
        throw new Error('This account does not have JIC administration access.');
      }

      const cleanName = auditName.trim();
      if (cleanName) {
        const { error: nameError } = await supabase.auth.updateUser({ data: { audit_name: cleanName } });
        if (nameError) console.warn('Unable to save audit display name:', nameError);
      }

      setLoading(false);
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      signInInProgress.current = false;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    ++profileRequest.current;
    currentUserId.current = null;
    setUser(null);
    setProfile(null);
    setLoading(false);
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
    user,
    profile,
    role,
    isAdmin,
    isSuperAdmin,
    loading,
    signIn,
    signOut,
    can,
    refreshProfile: () => loadProfile(user),
  }), [user, profile, role, isAdmin, isSuperAdmin, loading, can, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
