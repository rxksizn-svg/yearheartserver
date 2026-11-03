import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import { ReleaseForm } from '@/components/dashboard/release-form'
import { requireProfile } from '@/lib/auth'
import { getReleaseById } from '@/lib/data/releases'
import { getArtistNames } from '@/lib/data/artist-names'
import { sameArtistName } from '@/lib/artist-names'

export const metadata: Metadata = {
  title: 'แก้ไขผลงานเพลง — Yearheart Artist Portal',
}

export default async function EditReleasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await requireProfile()
  const release = await getReleaseById(id)

  if (!release) notFound()

  // Only rejected releases can be edited by the customer.
  if (release.status !== 'rejected') {
    redirect('/releases')
  }

  const registered = (await getArtistNames(profile.id)).map((n) => n.name)
  const artistOptions = registered.some((n) => sameArtistName(n, release.artist_name))
    ? registered
    : [release.artist_name, ...registered]

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="แก้ไขผลงานที่ถูกปฏิเสธ"
        description="ปรับปรุงข้อมูลตามหมายเหตุของทีมงาน แล้วส่งกลับเพื่อให้ตรวจสอบอีกครั้ง"
      />
      {release.admin_note ? (
        <div className="border-destructive/30 bg-destructive/10 mb-6 rounded-xl border p-4">
          <p className="text-destructive text-sm font-medium">
            หมายเหตุจากทีมงาน (เหตุผลที่ถูกปฏิเสธ)
          </p>
          <p className="text-foreground/80 mt-1 text-sm text-pretty">
            {release.admin_note}
          </p>
        </div>
      ) : null}
      <ReleaseForm userId={profile.id} release={release} artistOptions={artistOptions} />
    </div>
  )
}
