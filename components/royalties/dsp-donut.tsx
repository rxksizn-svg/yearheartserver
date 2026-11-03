'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { dspColor } from '@/lib/platforms'
import { formatTHB, formatTHBCompact } from '@/lib/format'

type Slice = { dsp: string; revenue: number }

export function DspDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)
  const slices = data.map((d) => ({ ...d, color: dspColor(d.dsp) }))

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const { dsp, revenue } = payload[0].payload as Slice
              return (
                <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{dsp}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatTHB(revenue)} ·{' '}
                    {total > 0 ? ((revenue / total) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              )
            }}
          />
          <Pie
            data={slices}
            dataKey="revenue"
            nameKey="dsp"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {slices.map((entry) => (
              <Cell key={entry.dsp} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-muted-foreground text-xs">รวม</span>
        <span className="text-xl font-semibold">{formatTHBCompact(total)}</span>
      </div>
    </div>
  )
}
