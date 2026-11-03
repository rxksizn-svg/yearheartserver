import { WITHDRAWAL_STATUS_LABELS, type WithdrawalStatus } from '@/lib/types'

const STYLES: Record<WithdrawalStatus, string> = {
  pending: 'bg-warning/15 text-warning',
  processing: 'bg-brand/15 text-brand',
  paid: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
}

export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {WITHDRAWAL_STATUS_LABELS[status]}
    </span>
  )
}
