import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { SupportManager } from '@/components/admin/support-manager'
import { requireAdmin } from '@/lib/admin-page'
import { getAllTickets } from '@/lib/data/support'

export const metadata: Metadata = {
  title: 'แชทสดกับผู้ใช้ — Yearheart Artist Portal',
}

export default async function AdminSupportPage() {
  const profile = await requireAdmin()
  const tickets = await getAllTickets()

  return (
    <>
      <PageHeader
        title="แชทสดกับผู้ใช้"
        description="ตอบคำถามผู้ใช้แบบเรียลไทม์ ปิดบทสนทนา และบันทึกการสนทนาเก็บไว้เป็นหลักฐาน"
      />
      <Card>
        <CardContent>
          <SupportManager initialTickets={tickets} currentAdminId={profile.id} />
        </CardContent>
      </Card>
    </>
  )
}
