import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const isConfigured = 
    supabaseUrl.startsWith('https://') && 
    !supabaseUrl.includes('placeholder-project') &&
    serviceRoleKey &&
    !serviceRoleKey.includes('placeholder-service-key') &&
    serviceRoleKey.length > 20;

  if (!isConfigured) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
