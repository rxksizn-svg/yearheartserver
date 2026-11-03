import { Badge } from '@/components/ui/badge'
import { TAKEDOWN_STATUS_LABELS, type TakedownStatus } from '@/lib/types'

const VARIANT: Record<
  TakedownStatus,
  'warning' | 'success' | 'destructive'
> = {
  pending: 'warning',
  completed: 'success',
  rejected: 'destructive',
}

export function TakedownStatusBadge({ status }: { status: TakedownStatus }) {
  return (
    <Badge variant={VARIANT[status]}>{TAKEDOWN_STATUS_LABELS[status]}</Badge>
  )
}
