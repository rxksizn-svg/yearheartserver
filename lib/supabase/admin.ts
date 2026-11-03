import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server
 * code after verifying the caller is an admin. Never expose to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
