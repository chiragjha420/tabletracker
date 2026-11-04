import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isConfigured = 
    supabaseUrl.startsWith('https://') && 
    !supabaseUrl.includes('placeholder-project') &&
    supabaseAnonKey !== 'placeholder-anon-key' &&
    supabaseAnonKey.length > 20;

  if (!isConfigured) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return (
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder-project') &&
    supabaseAnonKey !== 'placeholder-anon-key' &&
    supabaseAnonKey.length > 20
  );
}
