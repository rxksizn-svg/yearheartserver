import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { ReleaseManager } from '@/components/admin/release-manager'
import { CatalogUpdater } from '@/components/admin/catalog-updater'
import { readQuery, requireAdmin } from '@/lib/admin-page'
import { listUsersWithBalances } from '@/lib/data/admin'
import { getAllReleases } from '@/lib/data/releases'

export const metadata: Metadata = {
  title: 'จัดการผลงานเพลง — Yearheart Artist Portal',
}

export default async function AdminReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  await requireAdmin()
  const [q, releases, users] = await Promise.all([
    readQuery(searchParams),
    getAllReleases(),
    listUsersWithBalances(),
  ])

  return (
    <>
      <PageHeader
        title="จัดการผลงานเพลง"
        description="ตรวจสอบข้อมูลที่ศิลปินส่งมา ปรับสถานะ ดาวน์โหลดไฟล์ และส่งออกข้อมูลเป็น CSV"
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent>
            <ReleaseManager key={q} releases={releases} initialQuery={q} />
          </CardContent>
        </Card>

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
      </div>
    </>
  )
}
