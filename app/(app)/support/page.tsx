import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { SupportCenter } from '@/components/support/support-center'
import { requireProfile } from '@/lib/auth'
import { getUserTickets } from '@/lib/data/support'

export const metadata: Metadata = {
  title: 'ช่วยเหลือ & แชทสด — Yearheart Artist Portal',
}

export default async function SupportPage() {
  const profile = await requireProfile()
  const tickets = await getUserTickets(profile.id)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="ช่วยเหลือ & แชทสด"
        description="เปิดคำถามถึงทีมงานและพูดคุยแบบเรียลไทม์เพื่อรับความช่วยเหลือ"
      />
      <SupportCenter initialTickets={tickets} currentUserId={profile.id} />
    </div>
  )
}
