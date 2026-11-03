import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { PostManager } from '@/components/admin/post-manager'
import { requireAdmin } from '@/lib/admin-page'
import { getAllPosts } from '@/lib/data/news'

export const metadata: Metadata = {
  title: 'จัดการข่าวสาร — Yearheart Artist Portal',
}

export default async function AdminNewsPage() {
  await requireAdmin()
  const posts = await getAllPosts()

  return (
    <>
      <PageHeader
        title="จัดการข่าวสาร"
        description="เขียนบทความบล็อกพร้อมภาพปก เผยแพร่ให้ลูกค้าอ่านในหน้าข่าวสาร หรือเก็บเป็นฉบับร่างไว้ก่อน"
      />
      <Card>
        <CardContent>
          <PostManager posts={posts} />
        </CardContent>
      </Card>
    </>
  )
}
