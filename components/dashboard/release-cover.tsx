'use client'

import * as React from 'react'
import { Disc3 } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ReleaseCover({
  releaseId,
  title,
  className,
}: {
  releaseId: string
  title: string
  className?: string
}) {
  const [failed, setFailed] = React.useState(false)

  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border',
        className,
      )}
    >
      {failed ? (
        <Disc3 className="size-1/2" aria-hidden="true" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- redirects to short-lived signed/Drive URLs
        <img
          src={`/api/releases/${releaseId}/cover`}
          alt={`ปกเพลง ${title}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
