import { formatThaiDate } from '@/lib/format'
import type { TakedownRequest } from '@/lib/types'
import { TakedownStatusBadge } from '@/components/takedown/takedown-status-badge'

export function TakedownHistory({ items }: { items: TakedownRequest[] }) {
  if (items.length === 0) return null

  return (
    <section className="border-border bg-card mt-6 rounded-xl border p-5">
      <h2 className="text-sm font-semibold">ประวัติคำขอ TakeDown</h2>
      <ul className="divide-border mt-3 divide-y">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {item.song_title}
                </p>
                <TakedownStatusBadge status={item.status} />
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {item.artist_name} · ส่งเมื่อ {formatThaiDate(item.created_at)}
              </p>
              {item.status === 'rejected' && item.admin_note && (
                <p className="text-destructive mt-1 text-xs">
                  หมายเหตุ: {item.admin_note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
