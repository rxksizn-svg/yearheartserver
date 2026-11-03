import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { TakedownManager } from '@/components/admin/takedown-manager'
import { readQuery, requireAdmin } from '@/lib/admin-page'
import { getAllTakedownRequests } from '@/lib/data/takedown'

export const metadata: Metadata = {
  title: 'TakeDown Admin — Yearheart Artist Portal',
}

export default async function AdminTakedownPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  await requireAdmin()
  const [q, requests] = await Promise.all([
    readQuery(searchParams),
    getAllTakedownRequests(),
  ])

  return (
    <>
      <PageHeader
        title="TakeDown Admin"
        description="ตรวจสอบคำขอลบเพลง และยืนยันผลเป็น TakeDown สำเร็จ หรือไม่สามารถ TakeDown ได้"
      />
      <Card>
        <CardContent>
          <TakedownManager key={q} requests={requests} initialQuery={q} />
        </CardContent>
      </Card>
    </>
  )
}
