import type { Metadata } from 'next'
import { TrendingUp, Play, Coins } from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { PeriodAreaChart } from '@/components/royalties/period-area-chart'
import { DspDonut } from '@/components/royalties/dsp-donut'
import { DspBreakdown } from '@/components/royalties/dsp-breakdown'
import { requireProfile } from '@/lib/auth'
import {
  getLineItems,
  aggregateByDsp,
  aggregateByPeriod,
} from '@/lib/data/royalties'
import { formatTHB, formatNumber } from '@/lib/format'

export const metadata: Metadata = {
  title: 'การวิเคราะห์รายได้ — Yearheart Artist Portal',
}

export default async function AnalyticsPage() {
  const profile = await requireProfile()
  const items = await getLineItems(profile.id)

  const byDsp = aggregateByDsp(items)
  const byPeriod = aggregateByPeriod(items)

  const totalRevenue = items
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + i.revenue_thb, 0)
  const totalStreams = items.reduce((s, i) => s + i.sales, 0)
  const perThousand = totalStreams > 0 ? (totalRevenue / totalStreams) * 1000 : 0

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="การวิเคราะห์รายได้"
        description="ติดตามรายได้ค่าลิขสิทธิ์จากทุกแพลตฟอร์มสตรีมมิ่ง (สกุลเงินบาท)"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="รายได้รวม"
          value={formatTHB(totalRevenue)}
          sub="ทุกแพลตฟอร์ม"
          icon={Coins}
          accent="success"
        />
        <StatCard
          label="ยอดสตรีมรวม"
          value={formatNumber(totalStreams)}
          sub="ทุกแพลตฟอร์ม"
          icon={Play}
          accent="brand"
        />
        <StatCard
          label="เฉลี่ยต่อ 1,000 สตรีม"
          value={formatTHB(perThousand)}
          sub="อัตราจ่ายเฉลี่ยรวม"
          icon={TrendingUp}
          accent="accent-2"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>แนวโน้มรายได้รายเดือน</CardTitle>
          <CardDescription>
            รายได้ค่าลิขสิทธิ์รวมในแต่ละงวด (บาท)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byPeriod.length > 0 ? (
            <PeriodAreaChart data={byPeriod} />
          ) : (
            <p className="text-muted-foreground py-16 text-center text-sm">
              ยังไม่มีข้อมูลรายได้
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>สัดส่วนรายได้</CardTitle>
            <CardDescription>แบ่งตามแพลตฟอร์ม</CardDescription>
          </CardHeader>
          <CardContent>
            {byDsp.length > 0 ? (
              <DspDonut data={byDsp} />
            ) : (
              <p className="text-muted-foreground py-16 text-center text-sm">
                ยังไม่มีข้อมูล
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>รายได้แยกตามแพลตฟอร์ม</CardTitle>
            <CardDescription>
              รายได้และยอดสตรีมของแต่ละ DSP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DspBreakdown data={byDsp} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
