'use client'

import * as React from 'react'
import { Wallet, Clock, Banknote, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  payouts,
  availableBalance,
  pendingBalance,
  formatUSD,
  formatTHB,
  USD_TO_THB,
  type Payout,
} from '@/lib/mock-data'

const statusVariant: Record<Payout['status'], 'success' | 'warning' | 'info'> = {
  Paid: 'success',
  Pending: 'warning',
  Processing: 'info',
}

export function PayoutsSection() {
  const [requested, setRequested] = React.useState(false)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="from-brand/10 to-accent-2/5 bg-gradient-to-br">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="bg-brand/15 text-brand flex size-10 items-center justify-center rounded-lg">
                <Wallet className="size-5" />
              </span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Available balance</p>
              <p className="text-2xl font-semibold tracking-tight">
                {formatUSD(availableBalance)}
              </p>
              <p className="text-muted-foreground text-xs">
                ≈ {formatTHB(availableBalance * USD_TO_THB)}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => setRequested(true)}
              disabled={requested}
            >
              {requested ? (
                <>
                  <CheckCircle2 />
                  Withdrawal requested
                </>
              ) : (
                <>
                  <Banknote />
                  Request withdrawal
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <span className="bg-warning/15 text-warning flex size-10 items-center justify-center rounded-lg">
              <Clock className="size-5" />
            </span>
            <div>
              <p className="text-muted-foreground text-sm">Pending clearance</p>
              <p className="text-2xl font-semibold tracking-tight">
                {formatUSD(pendingBalance)}
              </p>
              <p className="text-muted-foreground text-xs">
                Clears within 30 days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <span className="bg-success/15 text-success flex size-10 items-center justify-center rounded-lg">
              <Banknote className="size-5" />
            </span>
            <div>
              <p className="text-muted-foreground text-sm">
                Lifetime withdrawals
              </p>
              <p className="text-2xl font-semibold tracking-tight">
                {formatUSD(
                  payouts
                    .filter((p) => p.status === 'Paid')
                    .reduce((sum, p) => sum + p.amount, 0),
                )}
              </p>
              <p className="text-muted-foreground text-xs">Across 4 payouts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Your recent withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium">{payout.id}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(payout.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payout.method}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatUSD(payout.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[payout.status]}>
                      {payout.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
