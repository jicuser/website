/**
 * ============================================================
 *  SUPABASE CONFIG  —  src/config/supabase.js
 * ============================================================
 *  Credentials come from the .env file — never hardcode them here.
 *  Copy .env.example → .env and fill in your values.
 * ============================================================
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
