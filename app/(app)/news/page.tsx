import type { Metadata } from 'next'
import { Newspaper } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { PostCard } from '@/components/news/post-card'
import { getPublishedPosts } from '@/lib/data/news'

export const metadata: Metadata = {
  title: 'ข่าวสาร — Yearheart Artist Portal',
}

export default async function NewsPage() {
  const posts = await getPublishedPosts()

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="ข่าวสาร" description="บทความ เคล็ดลับ และข่าวอัปเดตจาก Yearheart" />
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="glass border-border/60 text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border py-16 text-sm">
          <Newspaper className="size-6" aria-hidden="true" />
          ยังไม่มีบทความ
        </div>
      )}
    </div>
  )
}
