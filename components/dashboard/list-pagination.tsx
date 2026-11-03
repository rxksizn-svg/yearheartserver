'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const PAGE_SIZE = 30

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = React.useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, totalPages)
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize)
  return { page: current, setPage, totalPages, pageItems, pageSize }
}

function pageWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function ListPagination({
  page,
  totalPages,
  totalItems,
  pageSize = PAGE_SIZE,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (totalItems <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  function go(p: number) {
    onPageChange(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      aria-label="เลือกหน้า"
      className={cn(
        'flex flex-col items-center gap-3 sm:flex-row sm:justify-between',
        className,
      )}
    >
      <p className="text-muted-foreground text-sm tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} จาก {totalItems.toLocaleString()} เพลง
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft />
        </Button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="text-muted-foreground px-1 text-sm">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'ghost'}
              className="h-11 min-w-11 px-2 tabular-nums"
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="หน้าถัดไป"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
