'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string
  children: React.ReactNode
  title?: string
  description?: string
}) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('DialogContent must be used within <Dialog>')
  const { open, onOpenChange } = ctx
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="animate-in fade-in-0 bg-foreground/40 absolute inset-0 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'bg-card text-card-foreground animate-in fade-in-0 zoom-in-95 relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border p-6 shadow-xl sm:max-w-lg sm:rounded-2xl',
          className,
        )}
      >
        {(title || description) && (
          <div className="mb-4 flex flex-col gap-1 pr-8">
            {title && (
              <h2 className="text-lg leading-none font-semibold tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-4 right-4 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="ปิด"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogFooter }
