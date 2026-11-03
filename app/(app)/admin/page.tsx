import type { Metadata } from 'next'
import { Users, Coins, Clock, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  PendingWorkList,
  RecentActivity,
  type RecentAdjustment,
} from '@/components/admin/admin-overview'
import type { QueueItem } from '@/components/admin/payout-manager'
import { requireAdmin, toArtistOptions } from '@/lib/admin-page'
import {
  listUsersWithBalances,
  getAllWithdrawalsDetailed,
  getRecentAdjustments,
} from '@/lib/data/admin'
import { getAllReleases } from '@/lib/data/releases'
import { getAllTickets } from '@/lib/data/support'
import { getAllTakedownRequests } from '@/lib/data/takedown'
import { formatTHB, formatNumber } from '@/lib/format'

export const metadata: Metadata = {
  title: 'ภาพรวมระบบ — Yearheart Artist Portal',
}

export default async function AdminOverviewPage() {
  await requireAdmin()

  const [users, withdrawals, adjustments, releases, tickets, takedowns] =
    await Promise.all([
      listUsersWithBalances(),
      getAllWithdrawalsDetailed(),
      getRecentAdjustments(),
      getAllReleases(),
      getAllTickets(),
      getAllTakedownRequests(),
    ])

  const queue = withdrawals as QueueItem[]
  const pendingQueue = queue.filter(
    (w) => w.status === 'pending' || w.status === 'processing',
  )
  const pendingTotal = pendingQueue.reduce((s, w) => s + w.amount_thb, 0)
  const totalAvailable = users.reduce(
    (s, u) => s + Math.max(0, u.balance.availableBalance),
    0,
  )
  const recentPayouts = queue
    .filter((w) => w.status === 'paid' || w.status === 'rejected')
    .slice(0, 6)

  return (
    <>
      <PageHeader
        title="ภาพรวมระบบ"
        description="สรุปยอดเงิน งานที่รอดำเนินการ และกิจกรรมล่าสุดของระบบ"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="บัญชีศิลปิน / ค่ายเพลง"
          value={formatNumber(toArtistOptions(users).length)}
          sub="ผู้รับรายได้ในระบบ"
          icon={Users}
          accent="brand"
        />
        <StatCard
          label="ยอดคงเหลือรวม"
          value={formatTHB(totalAvailable)}
          sub="ยอดที่พร้อมให้ถอนทั้งระบบ"
          icon={Wallet}
          accent="accent-2"
        />
        <StatCard
          label="คำขอถอนที่รอดำเนินการ"
          value={formatNumber(pendingQueue.length)}
          sub="รอการอนุมัติ/โอน"
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label="ยอดรอจ่ายรวม"
          value={formatTHB(pendingTotal)}
          sub="มูลค่าคำขอที่ค้างอยู่"
          icon={Coins}
          accent="success"
        />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <PendingWorkList
          items={[
            {
              href: '/admin/releases',
              label: 'ผลงานเพลงรอตรวจสอบ',
              count: releases.filter(
                (r) => r.status === 'submitted' || r.status === 'in_review',
              ).length,
            },
            {
              href: '/admin/takedown',
              label: 'คำขอ TakeDown รอดำเนินการ',
              count: takedowns.filter((t) => t.status === 'pending').length,
            },
            {
              href: '/admin/payouts',
              label: 'คำขอถอนเงินรอดำเนินการ',
              count: pendingQueue.length,
            },
            {
              href: '/admin/support',
              label: 'แชทที่ยังเปิดอยู่',
              count: tickets.filter((t) => t.status === 'open').length,
            },
          ]}
        />
        <RecentActivity
          adjustments={adjustments as RecentAdjustment[]}
          recentPayouts={recentPayouts}
        />
      </div>
    </>
  )
}
