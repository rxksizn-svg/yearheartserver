import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { UserTable } from '@/components/admin/user-table'
import { readQuery, requireAdmin } from '@/lib/admin-page'
import { listUsersWithBalances } from '@/lib/data/admin'

export const metadata: Metadata = {
  title: 'จัดการผู้ใช้ — Yearheart Artist Portal',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  await requireAdmin()
  const [q, users] = await Promise.all([readQuery(searchParams), listUsersWithBalances()])

  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้"
        description="แก้ไขบทบาท สถานะบัญชี ปรับยอดเงิน หรือลบบัญชีผู้ใช้"
      />
      <Card>
        <CardContent>
          <UserTable key={q} users={users} initialQuery={q} />
        </CardContent>
      </Card>
    </>
  )
}
