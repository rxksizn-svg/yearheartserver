import { createClient } from '@/lib/supabase/server'
import type { ArtistNameEntry } from '@/lib/artist-names'

/** Artist names an admin has registered for this user (RLS: owner or admin). */
export async function getArtistNames(userId: string): Promise<ArtistNameEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('artist_names')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return (data ?? []) as ArtistNameEntry[]
}
