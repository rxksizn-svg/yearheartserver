import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { AnnouncementManager } from '@/components/admin/announcement-manager'
import { requireAdmin } from '@/lib/admin-page'
import { getAllAnnouncements } from '@/lib/data/news'

export const metadata: Metadata = {
  title: 'จัดการประกาศ — Yearheart Artist Portal',
}

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const announcements = await getAllAnnouncements()

  return (
    <>
      <PageHeader
        title="จัดการประกาศ"
        description="เขียนประกาศพร้อมแนบภาพถึงผู้ใช้ทุกคน และเลือกให้ขึ้นในแถบประกาศเลื่อนบนหัวเว็บ"
      />
      <Card>
        <CardContent>
          <AnnouncementManager announcements={announcements} />
        </CardContent>
      </Card>
    </>
  )
}
