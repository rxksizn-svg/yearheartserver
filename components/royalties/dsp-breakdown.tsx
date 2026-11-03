import { dspToPlatform } from '@/lib/platforms'
import { formatTHB, formatNumber } from '@/lib/format'

type Row = { dsp: string; revenue: number; streams: number }

export function DspBreakdown({ data }: { data: Row[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const max = sorted[0]?.revenue ?? 0

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        ยังไม่มีข้อมูลรายได้
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {sorted.map((row) => {
        const platform = dspToPlatform(row.dsp)
        return (
          <div key={row.dsp} className="space-y-2">
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
                <p className="text-sm font-medium">{row.dsp}</p>
                <p className="text-muted-foreground text-xs">
                  {formatNumber(row.streams)} สตรีม
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatTHB(row.revenue)}
              </p>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${max > 0 ? (row.revenue / max) * 100 : 0}%`,
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
