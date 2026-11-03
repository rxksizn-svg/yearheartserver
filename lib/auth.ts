import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

/**
 * Returns the authenticated user's profile, or redirects to /login.
 * Use in Server Components / layouts that require an authenticated session.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, email, name, role, status, artist_name, label_name, payout_info, created_at, updated_at',
    )
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Session exists but the profile row is missing (e.g. trigger lag).
    // Fall back to a minimal profile derived from the auth user.
    return {
      id: user.id,
      email: user.email ?? '',
      name: (user.user_metadata?.name as string) ?? null,
      role: 'artist',
      status: 'active',
      artist_name: null,
      label_name: null,
      payout_info: null,
      created_at: user.created_at,
      updated_at: user.created_at,
    }
  }

  return profile as Profile
}
