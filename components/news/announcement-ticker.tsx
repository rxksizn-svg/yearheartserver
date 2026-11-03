import Link from 'next/link'
import { Megaphone } from 'lucide-react'

export type TickerItem = { id: string; title: string }

function TickerRun({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-10">
          <Link
            href={`/announcements#a-${item.id}`}
            tabIndex={hidden ? -1 : undefined}
            className="text-foreground/90 hover:text-primary text-sm whitespace-nowrap transition-colors"
          >
            {item.title}
          </Link>
          <span className="bg-primary/50 size-1 rounded-full" aria-hidden="true" />
        </li>
      ))}
    </ul>
  )
}

export function AnnouncementTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null
  const seconds = Math.max(20, items.length * 9)

  return (
    <section
      aria-label="ประกาศจากค่ายเพลง"
      className="border-border/60 bg-primary/5 relative flex h-10 items-center border-b backdrop-blur-xl"
    >
      <Link
        href="/announcements"
        className="text-primary border-border/60 flex h-full shrink-0 items-center gap-2 border-r px-4 text-xs font-medium"
      >
        <Megaphone className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">ประกาศ</span>
        <span className="sr-only sm:hidden">ดูประกาศทั้งหมด</span>
      </Link>
      <div className="ticker-mask flex min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track flex" style={{ animationDuration: `${seconds}s` }}>
          <TickerRun items={items} />
          <TickerRun items={items} hidden />
        </div>
      </div>
    </section>
  )
}
