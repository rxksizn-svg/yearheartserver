import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import {
  PayoutManager,
  type QueueItem,
  type PayoutDetail,
} from '@/components/admin/payout-manager'
import { requireAdmin } from '@/lib/admin-page'
import { getAllWithdrawalsDetailed, getPayoutProfilesByUser } from '@/lib/data/admin'

export const metadata: Metadata = {
  title: 'คำขอถอนเงิน — Yearheart Artist Portal',
}

export default async function AdminPayoutsPage() {
  await requireAdmin()
  const withdrawals = await getAllWithdrawalsDetailed()
  const profiles = await getPayoutProfilesByUser(
    Array.from(new Set(withdrawals.map((w) => w.user_id))),
  )

  const payoutDetails: Record<string, PayoutDetail> = {}
  for (const [userId, p] of profiles) {
    payoutDetails[userId] = {
      full_name: p.full_name,
      address: p.address,
      national_id: p.national_id,
      phone: p.phone,
      email: p.email,
      bank_name: p.bank_name,
      bank_account_number: p.bank_account_number,
    }
  }

  return (
    <>
      <PageHeader
        title="คำขอถอนเงิน"
        description="อนุมัติจ่าย ปฏิเสธ พร้อมดูข้อมูลบัญชีธนาคารของผู้ใช้"
      />
      <Card>
        <CardContent>
          <PayoutManager
            items={withdrawals as QueueItem[]}
            payoutDetails={payoutDetails}
          />
        </CardContent>
      </Card>
    </>
  )
}
