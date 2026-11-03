import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { XlsxImport } from '@/components/admin/xlsx-import'
import { ImportPanel } from '@/components/admin/import-panel'
import { requireAdmin, toArtistOptions } from '@/lib/admin-page'
import { listUsersWithBalances } from '@/lib/data/admin'

export const metadata: Metadata = {
  title: 'นำเข้ารายได้ — Yearheart Artist Portal',
}

function NoArtists() {
  return (
    <p className="text-muted-foreground py-8 text-center text-sm">
      ยังไม่มีบัญชีศิลปินในระบบ
    </p>
  )
}

export default async function AdminRevenuePage() {
  await requireAdmin()
  const artists = toArtistOptions(await listUsersWithBalances())

  return (
    <>
      <PageHeader
        title="นำเข้ารายได้"
        description="นำเข้ารายงานรายได้จากแพลตฟอร์มเพื่อคำนวณยอดของศิลปินแต่ละคน"
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>นำเข้าจากไฟล์ Excel / CSV</CardTitle>
            <CardDescription>
              อัปโหลดรายงานรายได้แล้วระบบจะจับคู่คอลัมน์และแสดงตัวอย่างก่อนบันทึก
            </CardDescription>
          </CardHeader>
          <CardContent>
            {artists.length > 0 ? <XlsxImport artists={artists} /> : <NoArtists />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>วางข้อมูล CSV หรือเพิ่มทีละรายการ</CardTitle>
            <CardDescription>สำหรับการเพิ่มข้อมูลแบบรวดเร็วโดยไม่ต้องมีไฟล์</CardDescription>
          </CardHeader>
          <CardContent>
            {artists.length > 0 ? <ImportPanel artists={artists} /> : <NoArtists />}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
