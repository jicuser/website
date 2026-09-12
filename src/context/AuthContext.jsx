import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import { hasPermission, hasAdminAccess } from '../../supabase/functions/_shared/access.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const signInInProgress = useRef(false);
  const currentUserId = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const loadProfile = useCallback(async (authUser) => {
    const request = ++profileRequest.current;
    if (!authUser) {
      profileRef.current = null;
      setProfile(null);
      return null;
    }

    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('Admin profile request timed out.')),
        10000,
      );
    });

    try {
      const profileQuery = supabase.rpc('get_my_profile');
      const { data, error } = await Promise.race([profileQuery, timeout]);

      if (request !== profileRequest.current) return null;
      if (error) throw error;

      const nextProfile = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      if (request === profileRequest.current) {
        console.error('Unable to load admin profile:', error);
        profileRef.current = null;
        setProfile(null);
      }
      throw error;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const finishSignedOut = () => {
      ++profileRequest.current;
      currentUserId.current = null;
      profileRef.current = null;
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
      try {
        await loadProfile(authUser);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth
      .getSession()
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const authUser = session?.user ?? null;

      if (event === 'SIGNED_OUT' || !authUser) {
        initialized = true;
        finishSignedOut();
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        currentUserId.current = authUser.id;
        setUser(authUser);
        return;
      }

      if (signInInProgress.current) {
        currentUserId.current = authUser.id;
        setUser(authUser);
        return;
      }

      if (currentUserId.current === authUser.id && profileRef.current) {
        initialized = true;
        setUser(authUser);
        setLoading(false);
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
  }, [loadProfile]);

  async function signIn(email, password) {
    signInInProgress.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      currentUserId.current = data.user.id;
      setUser(data.user);

      const nextProfile = await loadProfile(data.user);
      if (!nextProfile) {
        await supabase.auth.signOut();
        throw new Error('Your JIC staff profile could not be loaded. Please try again.');
      }

      if (!hasAdminAccess(nextProfile)) {
        await supabase.auth.signOut();
        throw new Error('This account does not have JIC administration access.');
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
    profileRef.current = null;
    setUser(null);
    setProfile(null);
    setLoading(false);
  }

  const isAdmin = Boolean(user && hasAdminAccess(profile));
  const isOwner = Boolean(isAdmin && profile?.is_owner);
  const can = useCallback(
    (permission) => Boolean(user && hasPermission(profile, permission)),
    [user, profile],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      isAdmin,
      isOwner,
      loading,
      signIn,
      signOut,
      can,
      refreshProfile: () => loadProfile(user),
    }),
    [user, profile, isAdmin, isOwner, loading, can, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
