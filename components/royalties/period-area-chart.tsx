'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatTHB, formatTHBCompact, formatPeriod } from '@/lib/format'

type Point = { period: string; revenue: number }

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: Point; value: number }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground text-xs">
        {formatPeriod(point.payload.period)}
      </p>
      <p className="font-semibold">{formatTHB(point.value)}</p>
    </div>
  )
}

export function PeriodAreaChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="fillPeriod" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="period"
            tickFormatter={(v) => formatPeriod(v)}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            stroke="var(--muted-foreground)"
            fontSize={12}
            width={64}
            tickFormatter={(v) => formatTHBCompact(v)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#fillPeriod)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
