import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PLATFORMS } from '@/lib/platforms'
import { platformRevenue, formatUSD, formatCompact } from '@/lib/mock-data'

export function PlatformBreakdown() {
  const sorted = [...platformRevenue].sort((a, b) => b.revenue - a.revenue)
  const max = sorted[0].revenue

  return (
    <div className="space-y-5">
      {sorted.map((row) => {
        const platform = PLATFORMS[row.id]
        const positive = row.change >= 0
        return (
          <div key={row.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className="flex size-8 items-center justify-center rounded-lg"
                style={{
                  color: platform.color,
                  backgroundColor: `${platform.color}1a`,
                }}
              >
                <platform.Icon className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{platform.name}</p>
                <p className="text-muted-foreground text-xs">
                  {formatCompact(row.streams)} streams
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatUSD(row.revenue)}
                </p>
                <p
                  className={cn(
                    'flex items-center justify-end gap-0.5 text-xs font-medium',
                    positive ? 'text-success' : 'text-destructive',
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(row.change)}%
                </p>
              </div>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(row.revenue / max) * 100}%`,
                  backgroundColor: platform.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
