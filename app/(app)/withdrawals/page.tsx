import type { Metadata } from 'next'
import { Wallet, Clock, BanknoteArrowDown } from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { WithdrawalForm } from '@/components/royalties/withdrawal-form'
import { PayoutProfileForm } from '@/components/royalties/payout-profile-form'
import { PayoutSchedule } from '@/components/royalties/payout-schedule'
import { WithdrawalStatusBadge } from '@/components/royalties/withdrawal-status-badge'
import { requireProfile } from '@/lib/auth'
import {
  getEarningsSummary,
  getWithdrawals,
  getPayoutProfile,
} from '@/lib/data/royalties'
import { getWithdrawalWindowForRole } from '@/lib/payout-schedule'
import { formatTHB, formatThaiDate } from '@/lib/format'

export const metadata: Metadata = {
  title: 'การถอนเงิน — Yearheart Artist Portal',
}

export default async function WithdrawalsPage() {
  const profile = await requireProfile()
  const [summary, withdrawals, payoutProfile] = await Promise.all([
    getEarningsSummary(profile.id),
    getWithdrawals(profile.id),
    getPayoutProfile(profile.id),
  ])
  const window = getWithdrawalWindowForRole(profile.role)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="การถอนเงิน"
        description="ขอเบิกถอนรายได้ค่าลิขสิทธิ์และจัดการข้อมูลการรับเงินของคุณ"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="ยอดเงินที่ถอนได้"
          value={formatTHB(summary.availableBalance)}
          sub="พร้อมขอเบิกถอน"
          icon={Wallet}
          accent="success"
        />
        <StatCard
          label="กำลังดำเนินการ"
          value={formatTHB(summary.pendingWithdrawals)}
          sub="คำขอที่รอการอนุมัติ"
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label="ถอนสำเร็จแล้ว"
          value={formatTHB(summary.totalWithdrawn)}
          sub="ยอดสะสมที่จ่ายแล้ว"
          icon={BanknoteArrowDown}
          accent="brand"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>ขอถอนเงิน</CardTitle>
            <CardDescription>โอนเข้าบัญชีธนาคารที่ลงทะเบียนไว้</CardDescription>
          </CardHeader>
          <CardContent>
            <WithdrawalForm
              availableBalance={summary.availableBalance}
              hasPayoutProfile={payoutProfile !== null}
              window={window}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ประวัติการถอนเงิน</CardTitle>
            <CardDescription>คำขอถอนเงินทั้งหมดของคุณ</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {withdrawals.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                ยังไม่มีประวัติการถอนเงิน
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">วันที่ขอ</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="pr-6">วันที่ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="pl-6">
                        {formatThaiDate(w.requested_at)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatTHB(w.amount_thb)}
                      </TableCell>
                      <TableCell>
                        <WithdrawalStatusBadge status={w.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-6">
                        {formatThaiDate(w.processed_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <PayoutSchedule window={window} />
      </div>

      <div id="payout-profile" className="mt-8 scroll-mt-20">
        <PageHeader
          title="ข้อมูลการรับเงิน"
          description="ข้อมูลผู้รับเงินและบัญชีธนาคารสำหรับการโอนค่าลิขสิทธิ์"
        />
        <PayoutProfileForm profile={payoutProfile} />
      </div>
    </div>
  )
}
