import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { RichText } from '@/components/news/rich-text'
import { getPostBySlug, siteMediaUrl } from '@/lib/data/news'
import { formatThaiDate } from '@/lib/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  return {
    title: post ? `${post.title} — Yearheart Artist Portal` : 'ไม่พบบทความ',
    description: post?.excerpt || undefined,
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  const cover = siteMediaUrl(post.cover_path)

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button
        nativeButton={false}
        render={<Link href="/news" />}
        variant="ghost"
        size="sm"
        className="self-start"
      >
        <ArrowLeft />
        ข่าวสารทั้งหมด
      </Button>

      <header className="flex flex-col gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <time dateTime={post.published_at ?? post.created_at}>
            {formatThaiDate(post.published_at ?? post.created_at)}
          </time>
          {!post.is_published ? (
            <span className="bg-warning/15 text-warning rounded-full px-2 py-0.5">ฉบับร่าง</span>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{post.title}</h1>
        {post.excerpt ? (
          <p className="text-muted-foreground text-base leading-relaxed text-pretty">{post.excerpt}</p>
        ) : null}
      </header>

      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={post.title}
          className="border-border/60 w-full rounded-2xl border object-cover"
        />
      ) : null}

      <RichText text={post.content} className="text-foreground/90 text-base" />
    </article>
  )
}
