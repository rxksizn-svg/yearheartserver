import { createClient } from '@/lib/supabase/server'
import type { TakedownRequest, TakedownRequestWithRefs } from '@/lib/types'

/** A user's own takedown requests, newest first. Gated by RLS. */
export async function getUserTakedownRequests(
  userId: string,
): Promise<TakedownRequest[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('takedown_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []) as TakedownRequest[]
}

/**
 * Every takedown request joined with the requester's profile and the target
 * release (admin only; gated by RLS). The joined release reflects the current
 * row — completed requests also keep an immutable `release_snapshot`.
 */
export async function getAllTakedownRequests(): Promise<
  TakedownRequestWithRefs[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('takedown_requests')
    .select(
      '*, profile:profiles!takedown_requests_user_id_fkey(name, email, artist_name), release:releases!takedown_requests_release_id_fkey(*)',
    )
    .order('created_at', { ascending: false })

  return (data ?? []) as TakedownRequestWithRefs[]
}
