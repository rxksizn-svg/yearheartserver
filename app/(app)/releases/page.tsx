import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/dashboard/page-header'
import { MyReleases } from '@/components/dashboard/my-releases'
import { requireProfile } from '@/lib/auth'
import { getUserReleases } from '@/lib/data/releases'

export const metadata: Metadata = {
  title: 'ผลงานเพลง — Yearheart Artist Portal',
}

export default async function ReleasesPage() {
  const profile = await requireProfile()
  const releases = await getUserReleases(profile.id, profile.email)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="ผลงานเพลง"
        description="ติดตามสถานะผลงานทุกชิ้นตั้งแต่ส่งเข้าระบบจนเผยแพร่บนแพลตฟอร์ม"
      >
        <Button nativeButton={false} render={<Link href="/releases/new" />}>
          <Plus />
          ส่งผลงานใหม่
        </Button>
      </PageHeader>
      <MyReleases releases={releases} />
    </div>
  )
}
