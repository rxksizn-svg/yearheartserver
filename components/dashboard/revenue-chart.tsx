'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { monthlyRevenue, formatUSD, formatCompact } from '@/lib/mock-data'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Metric = 'revenue' | 'streams'

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  metric: Metric
}) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground text-xs">{label} 2026</p>
      <p className="font-semibold">
        {metric === 'revenue'
          ? formatUSD(value)
          : `${formatCompact(value)} streams`}
      </p>
    </div>
  )
}

export function RevenueChart() {
  const [metric, setMetric] = React.useState<Metric>('revenue')
  const color = metric === 'revenue' ? 'var(--chart-1)' : 'var(--chart-2)'

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Revenue overview</CardTitle>
          <CardDescription>
            {metric === 'revenue'
              ? 'Monthly streaming revenue (USD)'
              : 'Monthly stream count across all platforms'}
          </CardDescription>
        </div>
        <CardAction>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="streams">Streams</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'revenue' ? (
              <AreaChart
                data={monthlyRevenue}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(v) => `$${formatCompact(v)}`}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  content={<ChartTooltip metric={metric} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#fillRevenue)"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={monthlyRevenue}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(v) => formatCompact(v)}
                />
                <Tooltip
                  cursor={{ fill: 'var(--accent)' }}
                  content={<ChartTooltip metric={metric} />}
                />
                <Bar dataKey="streams" fill={color} radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
