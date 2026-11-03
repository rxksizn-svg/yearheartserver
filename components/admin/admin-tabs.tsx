'use client'

import * as React from 'react'
import {
  Users,
  BanknoteArrowDown,
  FileUp,
  Activity,
  Disc3,
  MessagesSquare,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { UserTable } from '@/components/admin/user-table'
import { PayoutManager, type QueueItem, type PayoutDetail } from '@/components/admin/payout-manager'
import { XlsxImport } from '@/components/admin/xlsx-import'
import { ImportPanel, type ArtistOption } from '@/components/admin/import-panel'
import { ReleaseManager } from '@/components/admin/release-manager'
import { CatalogUpdater } from '@/components/admin/catalog-updater'
import { SupportManager } from '@/components/admin/support-manager'
import type { AdminUserRow } from '@/lib/data/admin'
import type { ReleaseWithProfile, SupportTicketWithProfile } from '@/lib/types'
import { formatTHB, formatThaiDate } from '@/lib/format'

export type RecentAdjustment = {
  id: string
  amount_thb: number
  type: 'credit' | 'debit'
  note: string | null
  created_at: string
  profile: { name: string | null; email: string } | null
}

function OverviewTab({
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
                    <Badge
                      variant={
                        w.status === 'paid'
                          ? 'success'
                          : w.status === 'rejected'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {w.status === 'paid'
                        ? 'จ่ายแล้ว'
                        : w.status === 'rejected'
                          ? 'ปฏิเสธ'
                          : w.status === 'processing'
                            ? 'กำลังโอน'
                            : 'รอดำเนินการ'}
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

export function AdminTabs({
  users,
  withdrawals,
  payoutDetails,
  artists,
  adjustments,
  releases,
  tickets,
  currentAdminId,
}: {
  users: AdminUserRow[]
  withdrawals: QueueItem[]
  payoutDetails: Record<string, PayoutDetail>
  artists: ArtistOption[]
  adjustments: RecentAdjustment[]
  releases: ReleaseWithProfile[]
  tickets: SupportTicketWithProfile[]
  currentAdminId: string
}) {
  const openTickets = tickets.filter((t) => t.status === 'open').length
  const pendingCount = withdrawals.filter(
    (w) => w.status === 'pending' || w.status === 'processing',
  ).length
  const pendingReleases = releases.filter(
    (r) => r.status === 'submitted' || r.status === 'in_review',
  ).length
  const recentPayouts = withdrawals
    .filter((w) => w.status === 'paid' || w.status === 'rejected')
    .slice(0, 6)

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">
          <Activity className="size-4" /> ภาพรวม
        </TabsTrigger>
        <TabsTrigger value="users">
          <Users className="size-4" /> ผู้ใช้ ({users.length})
        </TabsTrigger>
        <TabsTrigger value="releases">
          <Disc3 className="size-4" /> ผลงานเพลง ({releases.length})
          {pendingReleases > 0 && (
            <span className="bg-warning/20 text-warning ml-1 rounded-full px-1.5 text-xs">
              {pendingReleases}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="payouts">
          <BanknoteArrowDown className="size-4" /> การถอนเงิน
          {pendingCount > 0 && (
            <span className="bg-warning/20 text-warning ml-1 rounded-full px-1.5 text-xs">
              {pendingCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="revenue">
          <FileUp className="size-4" /> นำเข้ารายได้
        </TabsTrigger>
        <TabsTrigger value="support">
          <MessagesSquare className="size-4" /> แชทสด
          {openTickets > 0 && (
            <span className="bg-warning/20 text-warning ml-1 rounded-full px-1.5 text-xs">
              {openTickets}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab adjustments={adjustments} recentPayouts={recentPayouts} />
      </TabsContent>

      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>จัดการผู้ใช้</CardTitle>
            <CardDescription>
              แก้ไขบทบาท สถานะบัญชี ปรับยอดเงิน หรือลบบัญชีผู้ใช้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserTable users={users} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="releases">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>อัพเดทแคทตาล็อค</CardTitle>
              <CardDescription>
                อัปเดตแคทตาล็อคแบบกลุ่มผ่าน CSV — โหลดข้อมูลเดิมมาแก้ไขแล้วบันทึกทับ
                หรือเพิ่มผลงานใหม่ ระบบจะผูกแต่ละรายการกับบัญชีเจ้าของผ่านอีเมล
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CatalogUpdater
                emailOptions={users.map((u) => ({ email: u.email, name: u.name }))}
                releases={releases}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>จัดการผลงานเพลง</CardTitle>
              <CardDescription>
                ตรวจสอบข้อมูลที่ศิลปินส่งมา ปรับสถานะ ดาวน์โหลดไฟล์ และส่งออกข้อมูลเป็น CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReleaseManager releases={releases} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="payouts">
        <Card>
          <CardHeader>
            <CardTitle>คำขอถอนเงิน</CardTitle>
            <CardDescription>
              อนุมัติจ่าย ปฏิเสธ พร้อมดูข้อมูลบัญชีธนาคารของผู้ใช้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayoutManager items={withdrawals} payoutDetails={payoutDetails} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="revenue">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>นำเข้าจากไฟล์ Excel / CSV</CardTitle>
              <CardDescription>
                อัปโหลดรายงานรายได้แล้วระบบจะจับคู่คอลัมน์และแสดงตัวอย่างก่อนบันทึก
              </CardDescription>
            </CardHeader>
            <CardContent>
              {artists.length > 0 ? (
                <XlsxImport artists={artists} />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  ยังไม่มีบัญชีศิลปินในระบบ
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>วางข้อมูล CSV หรือเพิ่มทีละรายการ</CardTitle>
              <CardDescription>
                สำหรับการเพิ่มข้อมูลแบบรวดเร็วโดยไม่ต้องมีไฟล์
              </CardDescription>
            </CardHeader>
            <CardContent>
              {artists.length > 0 ? (
                <ImportPanel artists={artists} />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  ยังไม่มีบัญชีศิลปินในระบบ
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="support">
        <Card>
          <CardHeader>
            <CardTitle>แชทสดกับผู้ใช้</CardTitle>
            <CardDescription>
              ตอบคำถามผู้ใช้แบบเรียลไทม์ ปิดบทสนทนา และบันทึกการสนทนาเก็บไว้เป็นหลักฐาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupportManager
              initialTickets={tickets}
              currentAdminId={currentAdminId}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
