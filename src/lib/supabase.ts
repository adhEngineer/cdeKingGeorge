import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    KING_GEORGE_CONFIG?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

const runtimeConfig = window.KING_GEORGE_CONFIG;
const supabaseUrl = runtimeConfig?.SUPABASE_URL || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = runtimeConfig?.SUPABASE_ANON_KEY || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
