import Link from 'next/link'
import { Wallet, TrendingUp, Play, BanknoteArrowDown, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { PeriodAreaChart } from '@/components/royalties/period-area-chart'
import { DspBreakdown } from '@/components/royalties/dsp-breakdown'
import { requireProfile } from '@/lib/auth'
import {
  getLineItems,
  getEarningsSummary,
  aggregateByDsp,
  aggregateByPeriod,
  aggregateByTitle,
} from '@/lib/data/royalties'
import { formatTHB, formatTHBCompact, formatNumber } from '@/lib/format'
import { getActiveAnnouncements } from '@/lib/data/news'
import { AnnouncementCard } from '@/components/news/announcement-card'

function displayName(name: string | null, email: string) {
  return name || email.split('@')[0]
}

export default async function DashboardPage() {
  const profile = await requireProfile()
  const [items, summary, announcements] = await Promise.all([
    getLineItems(profile.id),
    getEarningsSummary(profile.id),
    getActiveAnnouncements(3),
  ])

  const byPeriod = aggregateByPeriod(items)
  const byDsp = aggregateByDsp(items).slice(0, 6)
  const topTitles = aggregateByTitle(items).slice(0, 5)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`สวัสดี, ${displayName(profile.artist_name || profile.label_name || profile.name, profile.email)}`}
        description="ภาพรวมรายได้ค่าลิขสิทธิ์จากทุกแพลตฟอร์มของคุณ"
      >
        <Button nativeButton={false} render={<Link href="/withdrawals" />}>
          <BanknoteArrowDown />
          ขอถอนเงิน
        </Button>
      </PageHeader>

      {announcements.length > 0 ? (
        <section aria-labelledby="home-announcements" className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="home-announcements" className="text-base font-semibold">
              ประกาศล่าสุด
            </h2>
            <Button
              nativeButton={false}
              render={<Link href="/announcements" />}
              variant="ghost"
              size="sm"
            >
              ดูทั้งหมด
              <ArrowRight />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} compact />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          icon={TrendingUp}
          accent="brand"
        />
        <StatCard
          label="ยอดสตรีมรวม"
          value={formatNumber(summary.totalStreams)}
          sub={`จาก ${byDsp.length} แพลตฟอร์ม`}
          icon={Play}
          accent="accent-2"
        />
        <StatCard
          label="ถอนไปแล้ว"
          value={formatTHB(summary.totalWithdrawn)}
          sub={
            summary.pendingWithdrawals > 0
              ? `รอดำเนินการ ${formatTHBCompact(summary.pendingWithdrawals)}`
              : 'ไม่มีรายการค้าง'
          }
          icon={BanknoteArrowDown}
          accent="warning"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>แนวโน้มรายได้</CardTitle>
            <CardDescription>รายได้ค่าลิขสิทธิ์รายเดือน (บาท)</CardDescription>
          </CardHeader>
          <CardContent>
            {byPeriod.length > 0 ? (
              <PeriodAreaChart data={byPeriod} />
            ) : (
              <p className="text-muted-foreground py-16 text-center text-sm">
                ยังไม่มีข้อมูลรายได้ในระบบ
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>รายได้ตามแพลตฟอร์ม</CardTitle>
            <CardDescription>สัดส่วนรายได้จากแต่ละ DSP</CardDescription>
          </CardHeader>
          <CardContent>
            <DspBreakdown data={byDsp} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>เพลงที่ทำรายได้สูงสุด</CardTitle>
            <CardDescription>
              จัดอันดับตามรายได้ค่าลิขสิทธิ์สะสม
            </CardDescription>
          </div>
          <CardAction>
            <Button
              nativeButton={false}
              render={<Link href="/earnings" />}
              variant="outline"
              size="sm"
            >
              ดูทั้งหมด
              <ArrowRight />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {topTitles.length > 0 ? (
            <ol className="divide-border divide-y">
              {topTitles.map((t, i) => (
                <li
                  key={t.title}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-muted-foreground w-5 text-center text-sm font-medium tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      ISRC {t.isrc} · {formatNumber(t.streams)} สตรีม
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatTHB(t.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              ยังไม่มีข้อมูลเพลง
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
