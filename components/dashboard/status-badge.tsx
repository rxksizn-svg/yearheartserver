import { CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL, type ReleaseStatus } from '@/lib/mock-data'

const config: Record<
  ReleaseStatus,
  { variant: 'success' | 'warning' | 'info' | 'destructive'; icon: typeof Clock }
> = {
  live: { variant: 'success', icon: CheckCircle2 },
  delivered: { variant: 'info', icon: Clock },
  processing: { variant: 'warning', icon: Loader2 },
  action_required: { variant: 'destructive', icon: AlertTriangle },
}

export function StatusBadge({ status }: { status: ReleaseStatus }) {
  const { variant, icon: Icon } = config[status]
  return (
    <Badge variant={variant}>
      <Icon className={status === 'processing' ? 'animate-spin' : undefined} />
      {STATUS_LABEL[status]}
    </Badge>
  )
}
