import { createBrowserClient } from '@supabase/ssr';

let cachedBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

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

  if (!cachedBrowserClient) {
    cachedBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return cachedBrowserClient;
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
