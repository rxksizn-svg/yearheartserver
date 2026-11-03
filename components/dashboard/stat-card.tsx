import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  sub,
  change,
  icon: Icon,
  accent = 'brand',
}: {
  label: string
  value: string
  sub?: string
  change?: number
  icon: LucideIcon
  accent?: 'brand' | 'accent-2' | 'success' | 'warning'
}) {
  const positive = (change ?? 0) >= 0
  const accentMap: Record<string, string> = {
    brand: 'bg-brand/10 text-brand',
    'accent-2': 'bg-accent-2/10 text-accent-2',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              accentMap[accent],
            )}
          >
            <Icon className="size-5" />
          </span>
          {typeof change === 'number' ? (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(change)}
              {Number.isInteger(change) ? '' : '%'}
            </span>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {sub ? <p className="text-muted-foreground text-xs">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
