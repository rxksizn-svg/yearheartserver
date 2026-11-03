import type { Metadata } from 'next'
import { Megaphone } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { AnnouncementCard } from '@/components/news/announcement-card'
import { getActiveAnnouncements } from '@/lib/data/news'

export const metadata: Metadata = {
  title: 'ประกาศ — Yearheart Artist Portal',
}

export default async function AnnouncementsPage() {
  const announcements = await getActiveAnnouncements()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="ประกาศ" description="ข่าวแจ้งและประกาศสำคัญจากค่ายเพลงถึงศิลปินทุกคน" />
      {announcements.length > 0 ? (
        <div className="flex flex-col gap-4">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      ) : (
        <div className="glass border-border/60 text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border py-16 text-sm">
          <Megaphone className="size-6" aria-hidden="true" />
          ยังไม่มีประกาศในขณะนี้
        </div>
      )}
    </div>
  )
}
