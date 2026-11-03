'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'

import {
  isBusinessOpen,
  isThaiHoliday,
  BUSINESS_HOURS_LABEL,
  BUSINESS_HOURS_NOTE,
} from '@/lib/business-hours'
import { cn } from '@/lib/utils'

/**
 * Shows the support business hours and whether the desk is currently open.
 * Recomputes every minute so the open/closed state stays accurate without a
 * page refresh.
 */
export function BusinessHoursBanner({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false)
  const [holiday, setHoliday] = React.useState(false)
  // Avoid hydration mismatch: only reflect live status after mount.
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const tick = () => {
      setOpen(isBusinessOpen())
      setHoliday(isThaiHoliday())
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={cn(
        'border-border bg-card flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-3',
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Clock className="size-4" />
        <span>
          เวลาทำการ:{' '}
          <span className="text-foreground font-medium">
            {BUSINESS_HOURS_LABEL}
          </span>{' '}
          <span className="text-xs">({BUSINESS_HOURS_NOTE})</span>
        </span>
      </div>

      {mounted && (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            open
              ? 'bg-success/15 text-success'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              open ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
          {open
            ? 'เปิดให้บริการอยู่'
            : holiday
              ? 'ปิดทำการ (วันหยุดนักขัตฤกษ์)'
              : 'นอกเวลาทำการ'}
        </span>
      )}

      {mounted && !open && (
        <p className="text-muted-foreground w-full text-xs">
          คุณยังเปิดการสนทนาและฝากข้อความได้ ทีมงานจะตอบกลับในเวลาทำการถัดไป
        </p>
      )}
    </div>
  )
}
