import Link from 'next/link'
import { Newspaper } from 'lucide-react'

import { siteMediaUrl, type Post } from '@/lib/data/news'
import { formatThaiDate } from '@/lib/format'

export function PostCard({ post }: { post: Post }) {
  const cover = siteMediaUrl(post.cover_path)

  return (
    <Link
      href={`/news/${post.slug}`}
      className="glass border-border/60 hover-lift group flex flex-col overflow-hidden rounded-2xl border"
    >
      <div className="bg-muted/40 aspect-[16/9] overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted-foreground/50 flex size-full items-center justify-center">
            <Newspaper className="size-8" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time
          dateTime={post.published_at ?? post.created_at}
          className="text-muted-foreground text-xs"
        >
          {formatThaiDate(post.published_at ?? post.created_at)}
        </time>
        <h3 className="group-hover:text-primary text-base font-semibold text-balance transition-colors">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
        ) : null}
      </div>
    </Link>
  )
}
