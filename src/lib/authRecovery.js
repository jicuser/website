import { withRequestTimeout } from './requestTimeout.js';

export const INITIAL_AUTH_STATE = {
  user: null,
  profile: null,
  loading: true,
  profileError: '',
};

// Auth notifications must return before a profile RPC asks the SDK for its token.
export function createAuthRecovery(client, onState, { timeoutMs = 10000 } = {}) {
  let state = { ...INITIAL_AUTH_STATE };
  let disposed = false;
  let revision = 0;
  let eventRevision = 0;
  let subscription;
  let pendingProfile;
  let signingIn = false;
  const timers = new Set();
  const patch = (changes) => {
    if (disposed) return;
    state = { ...state, ...changes };
    onState(state);
  };
  const invalidate = () => {
    ++revision;
    pendingProfile?.controller.abort();
    pendingProfile = null;
  };
  const deadline = (operation, options = {}) =>
    withRequestTimeout(operation, { timeoutMs, ...options });

  async function acceptSession(session, force = false) {
    if (disposed) return null;
    const user = session?.user ?? null;
    if (!user) {
      invalidate();
      patch({ user: null, profile: null, loading: false, profileError: '' });
      return null;
    }
    if (!force && state.user?.id === user.id) {
      if (pendingProfile) return pendingProfile.promise;
      if (state.profile) {
        patch({ user, loading: false });
        return state.profile;
      }
    }
    invalidate();
    const request = revision;
    const controller = new AbortController();
    patch({ user, profile: null, loading: true, profileError: '' });
    const promise = (async () => {
      try {
        const { data, error } = await deadline(
          (signal) => client.rpc('get_my_profile').abortSignal(signal),
          { signal: controller.signal, message: 'Staff access request timed out.' },
        );
        if (disposed || request !== revision) return null;
        if (error) throw error;
        const profile = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
        patch({ profile, profileError: '', loading: false });
        return profile;
      } catch (error) {
        if (disposed || request !== revision) return null;
        patch({
          profile: null,
          loading: false,
          profileError:
            'Could not load your staff access. Your login is kept; retry the connection.',
        });
        throw error;
      } finally {
        if (request === revision) pendingProfile = null;
      }
    })();
    pendingProfile = { userId: user.id, controller, promise };
    return promise;
  }

  async function restore() {
    const event = eventRevision;
    invalidate();
    const request = revision;
    patch({ loading: true, profileError: '' });
    try {
      const { data, error } = await deadline(() => client.auth.getSession(), {
        message: 'Restoring your login timed out.',
      });
      if (disposed || event !== eventRevision || request !== revision) return;
      if (error) throw error;
      return await acceptSession(data?.session ?? null, true);
    } catch (error) {
      // acceptSession already gives profile errors their own retry message.
      if (disposed || event !== eventRevision || request !== revision) return;
      patch({
        loading: false,
        profileError:
          'Could not restore your login connection. Retry to continue; your saved login has not been cleared.',
      });
      throw error;
    }
  }

  return {
    getSnapshot: () => state,
    start() {
      subscription = client.auth.onAuthStateChange((event, session) => {
        if (disposed) return;
        // A failed SDK restoration may emit INITIAL_SESSION with null. The
        // explicit getSession result below preserves its error for Retry.
        if (event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_OUT') {
          ++eventRevision;
          acceptSession(null);
          return;
        }
        if (!session?.user) return;
        if (signingIn) return;
        if (
          ['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) &&
          state.user?.id === session.user.id
        ) {
          patch({ user: session.user });
          return;
        }
        const queuedEvent = ++eventRevision;
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (!disposed && queuedEvent === eventRevision) acceptSession(session).catch(() => {});
        }, 0);
        timers.add(timer);
      }).data.subscription;
      restore().catch(() => {});
    },
    async signIn(email, password) {
      signingIn = true;
      ++eventRevision;
      invalidate();
      const request = revision;
      patch({ loading: true, profileError: '' });
      try {
        const { data, error } = await deadline(
          () => client.auth.signInWithPassword({ email, password }),
          { message: 'Sign in timed out. Check your connection and try again.' },
        );
        if (error) throw error;
        if (disposed || request !== revision)
          throw new DOMException('Sign in was interrupted. Please retry.', 'AbortError');
        const profile = await acceptSession(data.session);
        if (disposed || state.user?.id !== data.user?.id)
          throw new DOMException('Sign in was interrupted. Please retry.', 'AbortError');
        return { ...data, profile };
      } finally {
        signingIn = false;
        patch({ loading: false });
      }
    },
    async signOut() {
      const { error } = await deadline(() => client.auth.signOut({ scope: 'local' }), {
        message: 'Log out timed out. Check your connection and try again.',
      });
      if (error) throw error;
      ++eventRevision;
      await acceptSession(null);
    },
    retry: restore,
    dispose() {
      disposed = true;
      ++eventRevision;
      invalidate();
      timers.forEach(clearTimeout);
      timers.clear();
      subscription?.unsubscribe();
    },
  };
}
