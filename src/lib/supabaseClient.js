// Single Supabase client for the entire app.
// Credentials are supplied at build time via VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY. Never put the service-role key in frontend code.
export { supabase } from '@/config/supabase';
