'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { updateWithdrawalStatus } from '@/app/actions/admin'
import type { WithdrawalRequest, WithdrawalStatus } from '@/lib/types'
import { formatTHB, formatThaiDate } from '@/lib/format'
import { WithdrawalStatusBadge } from '@/components/royalties/withdrawal-status-badge'
import { Button } from '@/components/ui/button'

type QueueItem = WithdrawalRequest & {
  profile: { name: string | null; email: string } | null
}

const initial = { status: 'idle' as const }

function ActionButton({
  id,
  nextStatus,
  label,
  variant,
}: {
  id: string
  nextStatus: WithdrawalStatus
  label: string
  variant?: 'default' | 'outline' | 'destructive'
}) {
  const [, formAction] = useActionState(updateWithdrawalStatus, initial)
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={nextStatus} />
      <PendingButton label={label} variant={variant} />
    </form>
  )
}

function PendingButton({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'default' | 'outline' | 'destructive'
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {label}
    </Button>
  )
}

export function WithdrawalQueue({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        ยังไม่มีคำขอถอนเงิน
      </p>
    )
  }

  return (
    <ul className="divide-border divide-y">
      {items.map((w) => (
        <li
          key={w.id}
          className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">
                {w.profile?.name || w.payee_name || w.profile?.email || 'ผู้ใช้'}
              </p>
              <WithdrawalStatusBadge status={w.status} />
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {w.bank_name} · {w.bank_account_number} · ขอเมื่อ{' '}
              {formatThaiDate(w.requested_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-sm font-semibold tabular-nums">
              {formatTHB(w.amount_thb)}
            </span>
            {w.status === 'pending' && (
              <ActionButton
                id={w.id}
                nextStatus="processing"
                label="เริ่มโอน"
              />
            )}
            {(w.status === 'pending' || w.status === 'processing') && (
              <>
                <ActionButton id={w.id} nextStatus="paid" label="จ่ายแล้ว" />
                <ActionButton
                  id={w.id}
                  nextStatus="rejected"
                  label="ปฏิเสธ"
                  variant="outline"
                />
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
