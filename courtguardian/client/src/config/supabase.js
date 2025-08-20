import { createClient } from '@supabase/supabase-js';

// Supabase configuration for client-side
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create Supabase client (only if credentials are provided)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey;
};

// Export configuration status
export const supabaseConfig = {
  url: supabaseUrl,
  isConfigured: isSupabaseConfigured()
};