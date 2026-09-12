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
import { createAuthRecovery, INITIAL_AUTH_STATE } from '@/lib/authRecovery';
import { hasPermission, hasAdminAccess } from '../../supabase/functions/_shared/access.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_AUTH_STATE);
  const recovery = useRef(null);
  useEffect(() => {
    const controller = createAuthRecovery(supabase, setState);
    recovery.current = controller;
    controller.start();
    return () => controller.dispose();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await recovery.current.signIn(email, password);
    if (!hasAdminAccess(data.profile)) {
      await recovery.current.signOut();
      throw new Error('This account does not have JIC administration access.');
    }
    return data;
  }, []);
  const signOut = useCallback(() => recovery.current.signOut(), []);
  const refreshProfile = useCallback(() => recovery.current.retry(), []);
  const { user, profile } = state;
  const isAdmin = Boolean(user && hasAdminAccess(profile));
  const isOwner = Boolean(isAdmin && profile?.is_owner);
  const can = useCallback(
    (permission) => Boolean(user && hasPermission(profile, permission)),
    [user, profile],
  );
  const value = useMemo(
    () => ({ ...state, isAdmin, isOwner, can, signIn, signOut, refreshProfile }),
    [state, isAdmin, isOwner, can, signIn, signOut, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
