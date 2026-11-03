import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { QueueItem } from '@/components/admin/payout-manager'
import { formatTHB, formatThaiDate } from '@/lib/format'

export type RecentAdjustment = {
  id: string
  amount_thb: number
  type: 'credit' | 'debit'
  note: string | null
  created_at: string
  profile: { name: string | null; email: string } | null
}

export type PendingWork = {
  href: string
  label: string
  count: number
}

export function PendingWorkList({ items }: { items: PendingWork[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>งานที่รอดำเนินการ</CardTitle>
        <CardDescription>กดเพื่อไปยังหน้าจัดการที่เกี่ยวข้อง</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border flex flex-col divide-y">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="hover:bg-muted -mx-2 flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors"
              >
                <span className="font-medium">{item.label}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={item.count > 0 ? 'warning' : 'secondary'}>
                    {item.count.toLocaleString('th-TH')}
                  </Badge>
                  <ArrowRight className="text-muted-foreground size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function RecentActivity({
  adjustments,
  recentPayouts,
}: {
  adjustments: RecentAdjustment[]
  recentPayouts: QueueItem[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>รายการปรับยอดล่าสุด</CardTitle>
          <CardDescription>การเติมและหักเงินโดยผู้ดูแลระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              ยังไม่มีรายการปรับยอด
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {adjustments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.profile?.name || a.profile?.email || 'ผู้ใช้'}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {a.note || (a.type === 'credit' ? 'เติมเงิน' : 'หักเงิน')} ·{' '}
                      {formatThaiDate(a.created_at)}
                    </p>
                  </div>
                  <span
                    className={
                      'shrink-0 text-sm font-semibold tabular-nums ' +
                      (a.type === 'credit' ? 'text-success' : 'text-destructive')
                    }
                  >
                    {a.type === 'credit' ? '+' : '−'}
                    {formatTHB(a.amount_thb)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>การถอนเงินล่าสุด</CardTitle>
          <CardDescription>คำขอที่ดำเนินการไปแล้ว</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayouts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              ยังไม่มีการถอนเงิน
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {recentPayouts.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {w.profile?.name || w.payee_name || w.profile?.email || 'ผู้ใช้'}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatThaiDate(w.processed_at ?? w.requested_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={w.status === 'paid' ? 'success' : 'destructive'}>
                      {w.status === 'paid' ? 'จ่ายแล้ว' : 'ปฏิเสธ'}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatTHB(w.amount_thb)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
