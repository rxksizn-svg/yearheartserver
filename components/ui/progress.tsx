import * as React from 'react'

import { cn } from '@/lib/utils'

function Progress({
  className,
  value = 0,
  indicatorClassName,
  ...props
}: React.ComponentProps<'div'> & {
  value?: number
  indicatorClassName?: string
}) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn(
        'bg-muted relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'bg-brand h-full rounded-full transition-all duration-500',
          indicatorClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export { Progress }
