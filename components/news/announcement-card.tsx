import { siteMediaUrl, type Announcement } from '@/lib/data/news'
import { formatThaiDate } from '@/lib/format'
import { RichText } from '@/components/news/rich-text'

export function AnnouncementCard({
  announcement,
  compact,
}: {
  announcement: Announcement
  compact?: boolean
}) {
  const image = siteMediaUrl(announcement.image_path)

  return (
    <article
      id={`a-${announcement.id}`}
      className="glass border-border/60 hover-lift flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={announcement.title}
          loading="lazy"
          className={compact ? 'aspect-[16/9] w-full object-cover' : 'max-h-[28rem] w-full object-cover'}
        />
      ) : null}
      <div className="flex flex-col gap-2 p-5">
        <time dateTime={announcement.created_at} className="text-muted-foreground text-xs">
          {formatThaiDate(announcement.created_at)}
        </time>
        <h3 className="text-base font-semibold text-balance">{announcement.title}</h3>
        {announcement.body ? (
          compact ? (
            <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
              {announcement.body}
            </p>
          ) : (
            <RichText text={announcement.body} className="text-muted-foreground" />
          )
        ) : null}
      </div>
    </article>
  )
}
