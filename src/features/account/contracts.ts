import type { Database } from '../../types/database.generated';

export interface AccountOriginSettings {
  readonly DEV?: boolean;
  readonly VITE_ACCOUNT_RETURN_ORIGIN?: string;
  readonly VITE_ACCOUNT_PREVIEW_ORIGIN?: string;
}

export type AccountReturnPath = '/portal' | '/admin/setup';
export type AccountProfile = Database['public']['Functions']['get_my_profile']['Returns'][number];
export type AccountAccessRequest = Database['public']['Tables']['account_access_requests']['Row'];

export interface PasswordlessSignInOptions {
  email: string;
  options: { emailRedirectTo: string; shouldCreateUser: false };
}
