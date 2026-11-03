'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>')
  return ctx
}

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange'> & {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? '')
  const value = controlledValue ?? uncontrolled

  const setValue = React.useCallback(
    (next: string) => {
      if (controlledValue === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [controlledValue, onValueChange],
  )

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center gap-1 rounded-lg p-1',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  const { value: active, setValue } = useTabs()
  const selected = active === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? 'active' : 'inactive'}
      onClick={() => setValue(value)}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all',
        'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
        selected
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<'div'> & { value: string }) {
  const { value: active } = useTabs()
  if (active !== value) return null
  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn('outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
