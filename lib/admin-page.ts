import { redirect } from 'next/navigation'

import { requireProfile } from '@/lib/auth'
import type { AdminUserRow } from '@/lib/data/admin'
import type { ArtistOption } from '@/components/admin/import-panel'

/** Page-level guard; layouts don't re-run on every navigation, pages do. */
export async function requireAdmin() {
  const profile = await requireProfile()
  if (profile.role !== 'admin') redirect('/')
  return profile
}

export async function readQuery(
  searchParams: Promise<{ q?: string | string[] }>,
): Promise<string> {
  const { q } = await searchParams
  return (Array.isArray(q) ? q[0] : q)?.trim() ?? ''
}

export function toArtistOptions(users: AdminUserRow[]): ArtistOption[] {
  return users
    .filter((u) => u.role !== 'admin')
    .map((u) => ({
      id: u.id,
      label: `${u.artist_name || u.label_name || u.name || u.email} (${u.email})`,
    }))
}
