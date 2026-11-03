'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { PLATFORMS } from '@/lib/platforms'
import { platformRevenue, formatUSD } from '@/lib/mock-data'

const data = platformRevenue.map((p) => ({
  name: PLATFORMS[p.id].name,
  value: p.revenue,
  color: PLATFORMS[p.id].color,
}))

const total = data.reduce((sum, d) => sum + d.value, 0)

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground text-xs">
        {formatUSD(value)} · {((value / total) * 100).toFixed(1)}%
      </p>
    </div>
  )
}

export function PlatformDonut() {
  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<DonutTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-muted-foreground text-xs">Total</span>
        <span className="text-xl font-semibold">{formatUSD(total)}</span>
      </div>
    </div>
  )
}
