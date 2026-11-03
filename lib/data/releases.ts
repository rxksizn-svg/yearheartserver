import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import type { Release, ReleaseWithProfile } from '@/lib/types'

/**
 * Releases visible to a single user, newest first. Includes releases the user
 * submitted from their account (user_id) as well as any release whose submitter
 * email matches the user's account email, so a release is always shown to the
 * owner of the email entered on the form. Both filters are gated by RLS.
 */
export async function getUserReleases(
  userId: string,
  email?: string | null,
): Promise<Release[]> {
  const supabase = await createClient()
  // Escape any comma so it can't break the PostgREST `or` filter grammar.
  const safeEmail = email?.replace(/,/g, '')

  return fetchAllRows<Release>((from, to) => {
    let query = supabase.from('releases').select('*')
    query = safeEmail
      ? query.or(`user_id.eq.${userId},submitter_email.ilike.${safeEmail}`)
      : query.eq('user_id', userId)
    return query
        .order('track_no', { ascending: false })
      .range(from, to)
  })
}

/** A single release by id. RLS restricts access to the owner or an admin. */
export async function getReleaseById(id: string): Promise<Release | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('releases')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return (data as Release | null) ?? null
}

/** Every release with the submitting account's profile (admin only; gated by RLS). */
export async function getAllReleases(): Promise<ReleaseWithProfile[]> {
  const supabase = await createClient()
  return fetchAllRows<ReleaseWithProfile>((from, to) =>
    supabase
      .from('releases')
      .select(
        '*, profile:profiles!releases_user_id_fkey(name, email, artist_name)',
      )
        .order('track_no', { ascending: false })
      .range(from, to)
      .returns<ReleaseWithProfile[]>(),
  )
}

/**
 * Create a short-lived signed URL for a private release asset. Returns null when
 * the path is empty or the object is missing. RLS restricts reads to the owner
 * or an admin.
 */
export async function getReleaseAssetUrl(
  path: string | null,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  if (!path) return null
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('release-assets')
    .createSignedUrl(path, expiresInSeconds)
  return data?.signedUrl ?? null
}
