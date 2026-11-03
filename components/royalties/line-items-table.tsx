'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import type { RoyaltyLineItem } from '@/lib/types'
import { dspToPlatform } from '@/lib/platforms'
import { formatTHB, formatNumber, formatPeriod } from '@/lib/format'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function LineItemsTable({ items }: { items: RoyaltyLineItem[] }) {
  const [query, setQuery] = React.useState('')
  const [dsp, setDsp] = React.useState<string>('all')

  const dspOptions = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.dsp))).sort(),
    [items],
  )

  const filtered = items.filter((i) => {
    const matchesDsp = dsp === 'all' || i.dsp === dsp
    const q = query.trim().toLowerCase()
    const matchesQuery =
      q.length === 0 ||
      i.catalogue_title.toLowerCase().includes(q) ||
      i.isrc.toLowerCase().includes(q)
    return matchesDsp && matchesQuery
  })

  const total = filtered.reduce((s, i) => s + i.revenue_thb, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อเพลงหรือ ISRC..."
            className="pl-9"
            aria-label="ค้นหารายการรายได้"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={dsp === 'all'}
            onClick={() => setDsp('all')}
            label="ทั้งหมด"
          />
          {dspOptions.map((d) => (
            <FilterChip
              key={d}
              active={dsp === d}
              onClick={() => setDsp(d)}
              label={d}
            />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เพลง</TableHead>
              <TableHead>แพลตฟอร์ม</TableHead>
              <TableHead>ประเภทรายได้</TableHead>
              <TableHead>งวด</TableHead>
              <TableHead className="text-right">สตรีม</TableHead>
              <TableHead className="text-right">รายได้ (บาท)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  ไม่พบรายการที่ตรงกับเงื่อนไข
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const platform = dspToPlatform(item.dsp)
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.catalogue_title}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.isrc}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span style={{ color: platform.color }}>
                          <platform.Icon className="size-4" />
                        </span>
                        {item.dsp}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.revenue_type_desc}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatPeriod(item.period)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(item.sales)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatTHB(item.revenue_thb)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>{formatNumber(filtered.length)} รายการ</span>
        <span>
          รวม <span className="text-foreground font-semibold">{formatTHB(total)}</span>
        </span>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'bg-brand text-brand-foreground rounded-full px-3 py-1 text-xs font-medium'
          : 'bg-muted text-muted-foreground hover:bg-accent rounded-full px-3 py-1 text-xs font-medium transition-colors'
      }
    >
      {label}
    </button>
  )
}
