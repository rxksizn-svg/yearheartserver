import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { UpcUpdater } from '@/components/admin/upc-updater'
import { requireAdmin } from '@/lib/admin-page'
import { getAllReleases } from '@/lib/data/releases'
import { createClient } from '@/lib/supabase/server'
import { normalizeText, type UpcCatalogRelease } from '@/lib/upc-matching'

export const metadata: Metadata = {
  title: 'อัพเดท UPC / ISRC — Yearheart Artist Portal',
}

export default async function AdminUpcPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [releases, { data: names }, { data: profiles }] = await Promise.all([
    getAllReleases(),
    supabase
      .from('artist_names')
      .select('name, profile:profiles!artist_names_user_id_fkey(email)')
      .returns<{ name: string; profile: { email: string } | null }[]>(),
    supabase.from('profiles').select('email').returns<{ email: string | null }[]>(),
  ])
  const accounts = (profiles ?? []).flatMap((p) => (p.email ? [p.email.trim().toLowerCase()] : []))

  const catalog: UpcCatalogRelease[] = releases.map((r) => ({
    id: r.id,
    track_no: r.track_no ?? null,
    song_title: r.song_title,
    artist_name: r.artist_name,
    album_name: r.album_name,
    track_type: r.track_type,
    upc_ean_isrc: r.upc_ean_isrc,
    isrc: r.isrc ?? null,
    owner_email: r.profile?.email ?? null,
  }))

  const owners: Record<string, string> = {}
  for (const n of names ?? []) {
    const key = normalizeText(n.name)
    if (key && n.profile && !owners[key]) owners[key] = n.profile.email
  }

  return (
    <>
      <PageHeader
        title="อัพเดท UPC / ISRC"
        description="อัปโหลดไฟล์ที่มีชื่อเพลง ชื่อศิลปิน UPC และ ISRC ระบบจะจับคู่ให้อัตโนมัติ เพลงที่ไม่มีในระบบจะถูกเพิ่มใหม่ และรายการที่ซ้ำจะถูกข้าม"
      />
      <Card>
        <CardContent>
          <UpcUpdater catalog={catalog} owners={owners} accounts={accounts} />
        </CardContent>
      </Card>
    </>
  )
}
