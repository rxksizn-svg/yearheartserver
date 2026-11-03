import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { TakedownForm } from '@/components/takedown/takedown-form'
import { TakedownHistory } from '@/components/takedown/takedown-history'
import { requireProfile } from '@/lib/auth'
import { getUserReleases } from '@/lib/data/releases'
import { getUserTakedownRequests } from '@/lib/data/takedown'

export const metadata: Metadata = {
  title: 'TakeDown — Yearheart Artist Portal',
}

export default async function TakedownPage() {
  const profile = await requireProfile()
  const [releases, requests] = await Promise.all([
    getUserReleases(profile.id, profile.email),
    getUserTakedownRequests(profile.id),
  ])

  // Block releases that already have a pending or completed request so they
  // can't be submitted twice.
  const blockedReleaseIds = requests
    .filter((r) => r.status !== 'rejected' && r.release_id)
    .map((r) => r.release_id as string)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="TakeDown — คำขอลบเพลงออกจากระบบ"
        description="เลือกเพลงที่ต้องการนำออกจากแพลตฟอร์ม แล้วส่งคำขอให้ทีมงานตรวจสอบและดำเนินการ"
      />
      <TakedownForm
        releases={releases}
        blockedReleaseIds={blockedReleaseIds}
        defaultContact={{
          name: profile.name ?? '',
          email: profile.email ?? '',
          phone: '',
        }}
      />
      <TakedownHistory items={requests} />
    </div>
  )
}
