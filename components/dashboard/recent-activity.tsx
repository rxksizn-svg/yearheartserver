import {
  CheckCircle2,
  DollarSign,
  Loader2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { recentActivity, type Activity } from '@/lib/mock-data'

const iconMap: Record<Activity['type'], { icon: LucideIcon; className: string }> =
  {
    live: { icon: CheckCircle2, className: 'bg-success/10 text-success' },
    revenue: { icon: DollarSign, className: 'bg-brand/10 text-brand' },
    processing: { icon: Loader2, className: 'bg-warning/10 text-warning' },
    action: { icon: AlertTriangle, className: 'bg-destructive/10 text-destructive' },
  }

export function RecentActivity() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest updates across your catalog</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1">
          {recentActivity.map((item, index) => {
            const { icon: Icon, className } = iconMap[item.type]
            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      className,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  {index < recentActivity.length - 1 ? (
                    <span className="bg-border my-1 w-px flex-1" />
                  ) : null}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium leading-tight">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {item.description}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.time}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
