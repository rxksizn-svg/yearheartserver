import { cn } from '@/lib/utils'
import { PLATFORMS, type PlatformId } from '@/lib/platforms'

export function PlatformBadges({
  platforms,
  className,
}: {
  platforms: PlatformId[]
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {platforms.map((id) => {
        const platform = PLATFORMS[id]
        return (
          <span
            key={id}
            title={platform.name}
            className="flex size-7 items-center justify-center rounded-full border bg-card"
            style={{ color: platform.color }}
          >
            <platform.Icon className="size-4" />
            <span className="sr-only">{platform.name}</span>
          </span>
        )
      })}
    </div>
  )
}
