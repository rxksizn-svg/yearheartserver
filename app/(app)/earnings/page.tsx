import type { Metadata } from 'next'
import Link from 'next/link'
import { Wallet, Coins, ListMusic, BanknoteArrowDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { LineItemsTable } from '@/components/royalties/line-items-table'
import { requireProfile } from '@/lib/auth'
import { getLineItems, getEarningsSummary } from '@/lib/data/royalties'
import { formatTHB, formatNumber } from '@/lib/format'

export const metadata: Metadata = {
  title: 'รายได้ & ค่าลิขสิทธิ์ — Yearheart Artist Portal',
}

export default async function EarningsPage() {
  const profile = await requireProfile()
  const [items, summary] = await Promise.all([
    getLineItems(profile.id),
    getEarningsSummary(profile.id),
  ])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="รายได้ & ค่าลิขสิทธิ์"
        description="รายการรายได้ทั้งหมดจากการจัดจำหน่ายเพลงของคุณ"
      >
        <Button nativeButton={false} render={<Link href="/withdrawals" />}>
          <BanknoteArrowDown />
          ขอถอนเงิน
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="ยอดเงินที่ถอนได้"
          value={formatTHB(summary.availableBalance)}
          sub="พร้อมขอเบิกถอน"
          icon={Wallet}
          accent="success"
        />
        <StatCard
          label="รายได้สะสมทั้งหมด"
          value={formatTHB(summary.totalEarned)}
          sub="ค่าลิขสิทธิ์ที่อนุมัติแล้ว"
          icon={Coins}
          accent="brand"
        />
        <StatCard
          label="จำนวนรายการ"
          value={formatNumber(items.length)}
          sub="บรรทัดรายได้ทั้งหมด"
          icon={ListMusic}
          accent="accent-2"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>รายการรายได้</CardTitle>
          <CardDescription>
            ค้นหาและกรองตามเพลงหรือแพลตฟอร์ม
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LineItemsTable items={items} />
        </CardContent>
      </Card>
    </div>
  )
}
