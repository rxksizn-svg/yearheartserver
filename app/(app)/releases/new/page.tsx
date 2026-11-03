import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { ReleaseConsentGate } from '@/components/dashboard/release-consent-gate'
import { requireProfile } from '@/lib/auth'
import { getArtistNames } from '@/lib/data/artist-names'

export const metadata: Metadata = {
  title: 'ส่งผลงานเพลง — Yearheart Artist Portal',
}

export default async function NewReleasePage() {
  const profile = await requireProfile()
  const artistNames = await getArtistNames(profile.id)

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="ส่งผลงานเพลงเข้าระบบ"
        description="กรอกข้อมูลผลงานให้ครบถ้วนเพื่อส่งจัดจำหน่ายผ่าน YearHeart Artist Service"
      />
      <ReleaseConsentGate
        userId={profile.id}
        artistOptions={artistNames.map((n) => n.name)}
        defaults={{
          submitterName: profile.name ?? undefined,
          submitterEmail: profile.email,
          artistName: profile.artist_name ?? undefined,
        }}
      />
    </div>
  )
}
