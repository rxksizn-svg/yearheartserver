import { Badge } from '@/components/ui/badge'
import { RELEASE_STATUS_LABELS, type ReleaseStatus } from '@/lib/types'

const VARIANT: Record<
  ReleaseStatus,
  'info' | 'warning' | 'brand' | 'destructive' | 'secondary' | 'success'
> = {
  submitted: 'info',
  in_review: 'warning',
  approved: 'brand',
  rejected: 'destructive',
  revised: 'warning',
  delivered: 'secondary',
  live: 'success',
  takedown: 'destructive',
}

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  return <Badge variant={VARIANT[status]}>{RELEASE_STATUS_LABELS[status]}</Badge>
}
